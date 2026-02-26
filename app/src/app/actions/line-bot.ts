import OpenAI from 'openai';
import { Client } from '@line/bot-sdk';
import { createAdminClient } from '@/utils/supabase/admin';
import { upsertAttendanceRecord } from '@/app/admin/attendance-actions/actions';

// Initialize clients
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const lineClient = new Client({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
    channelSecret: process.env.LINE_CHANNEL_SECRET || '',
});

// ══════════════════════════════════════════════════════════════
// SAFETY: Rate limiting - max 1 request per 3 seconds per user
// ══════════════════════════════════════════════════════════════
const lastRequestTime: Record<string, number> = {};
const RATE_LIMIT_MS = 3000;

/**
 * Process an incoming text message from LINE
 */
export async function processLineMessage(text: string, replyToken: string, userId: string): Promise<void> {
    try {
        // ═══════════════════════════════════════════════
        // SAFETY: Rate limiting (1 request per 3 seconds)
        // ═══════════════════════════════════════════════
        const now = Date.now();
        if (lastRequestTime[userId] && (now - lastRequestTime[userId]) < RATE_LIMIT_MS) {
            await lineClient.replyMessage(replyToken, {
                type: 'text',
                text: '⏳ Please wait a few seconds between requests.'
            });
            return;
        }
        lastRequestTime[userId] = now;

        // 1. Send the text to OpenAI with the function calling definition
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an AI assistant for the Natsuki Attendance System. Your ONLY job is to extract attendance information from admin messages and call the update_attendance function.

RULES:
- Today's date is ${new Date().toISOString().split('T')[0]}.
- If the user does not specify a date, assume today.
- If they say "yesterday", calculate the correct date.
- Times MUST be in HH:mm:ss format (24-hour), e.g. 08:30:00 or 17:30:00.
- Status should be 'present' when times are provided. Only use 'absent' if explicitly stated.
- You can ONLY add or update ONE attendance record at a time. If the user asks to update multiple employees, process only the FIRST one and tell them to send the rest separately.
- You CANNOT delete records. If asked to delete, explain that deletion must be done from the admin dashboard.
- You CANNOT list employees, read the database, or do anything other than add/update a single attendance record.
- If the message is not about attendance, politely explain you can only help with attendance entries.`
                },
                {
                    role: "user",
                    content: text
                }
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "update_attendance",
                        description: "Updates or inserts a SINGLE attendance record for ONE employee on ONE date. This is the ONLY action available.",
                        parameters: {
                            type: "object",
                            properties: {
                                employee_name_query: {
                                    type: "string",
                                    description: "The name of the employee to search for (e.g., 'mariko'). Only ONE employee per request."
                                },
                                date: {
                                    type: "string",
                                    description: "The date of the attendance record in YYYY-MM-DD format. Only ONE date per request."
                                },
                                check_in_at: {
                                    type: "string",
                                    description: "The check-in time in HH:mm:ss format (24-hour)",
                                },
                                check_out_at: {
                                    type: "string",
                                    description: "The check-out time in HH:mm:ss format (24-hour)",
                                },
                                status: {
                                    type: "string",
                                    description: "The attendance status. Use 'present' when times are provided, 'absent' only if explicitly stated.",
                                    enum: ["present", "absent"]
                                }
                            },
                            required: ["employee_name_query", "date", "status"],
                        }
                    }
                }
            ],
            tool_choice: "auto",
        });

        const responseMessage = response.choices[0].message;

        // ═══════════════════════════════════════════════════════════════
        // SAFETY: Only process the FIRST tool call, ignore any extras
        // ═══════════════════════════════════════════════════════════════
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            if (responseMessage.tool_calls.length > 1) {
                console.warn(`[LINE BOT] AI tried to make ${responseMessage.tool_calls.length} tool calls. Only processing the first one.`);
            }

            const toolCall = responseMessage.tool_calls[0];

            if (toolCall.type === 'function' && toolCall.function.name === 'update_attendance') {
                const args = JSON.parse(toolCall.function.arguments);

                console.log(`[LINE BOT] Processing: ${JSON.stringify(args)}`);

                // Execute the database action
                const resultMessage = await handleAttendanceUpdate(args);

                // Reply to the user on LINE
                await lineClient.replyMessage(replyToken, {
                    type: 'text',
                    text: resultMessage
                });
                return;
            }
        }

        // If no function was called, it was a conversational message
        const replyText = responseMessage.content || "I can only help with attendance entries. Try something like:\n'set Evan 8:30am in and 5:30pm out for Feb 27'";

        await lineClient.replyMessage(replyToken, {
            type: 'text',
            text: replyText
        });

    } catch (error: any) {
        console.error("Error processing LINE message:", error?.message || error);
        console.error("Full error:", JSON.stringify(error, null, 2));
        try {
            await lineClient.replyMessage(replyToken, {
                type: 'text',
                text: `Sorry, an error occurred: ${error?.message || 'Unknown error'}`
            });
        } catch (replyError) {
            console.error("Failed to send error reply:", replyError);
        }
    }
}

/**
 * Handle the actual database update (INSERT or UPDATE only, never DELETE)
 */
async function handleAttendanceUpdate(args: {
    employee_name_query: string,
    date: string,
    check_in_at?: string,
    check_out_at?: string,
    status: string
}): Promise<string> {
    const supabase = createAdminClient();

    // ═══════════════════════════════════════════
    // SAFETY: Validate the date is reasonable
    // ═══════════════════════════════════════════
    const targetDate = new Date(args.date);
    const today = new Date();
    const daysDiff = Math.abs((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 60) {
        return `⚠️ Safety check: The date ${args.date} is more than 60 days from today. Please use the admin dashboard for older records.`;
    }

    // 1. Search for the employee
    const { data: people, error: searchError } = await supabase
        .from('people')
        .select('id, full_name')
        .eq('role', 'employee')
        .ilike('full_name', `%${args.employee_name_query}%`)
        .limit(5); // Get up to 5 matches to check for ambiguity

    if (searchError) {
        console.error("Error searching employee:", searchError);
        return `❌ Database error while searching for employee: ${args.employee_name_query} - ${searchError.message}`;
    }

    if (!people || people.length === 0) {
        return `❌ Could not find an employee matching "${args.employee_name_query}".`;
    }

    // ═══════════════════════════════════════════════════════════
    // SAFETY: If multiple employees match, ask for clarification
    // ═══════════════════════════════════════════════════════════
    if (people.length > 1) {
        const names = people.map(p => p.full_name).join('\n- ');
        return `⚠️ Multiple employees match "${args.employee_name_query}":\n- ${names}\n\nPlease use the full name to be specific.`;
    }

    const employeeId = people[0].id;
    const employeeName = people[0].full_name;

    // 2. Convert time strings to full ISO timestamps
    const checkInAt = args.check_in_at ? `${args.date}T${args.check_in_at}+09:00` : null;
    const checkOutAt = args.check_out_at ? `${args.date}T${args.check_out_at}+09:00` : null;

    // 3. Map the data for the upsert function
    const updateData = {
        check_in_at: checkInAt,
        check_out_at: checkOutAt,
        status: args.status,
        admin_note: 'Updated via LINE AI Bot'
    };

    // 4. Call the SAME server action used by the web dashboard (upsert = insert or update, NEVER delete)
    const result = await upsertAttendanceRecord(employeeId, args.date, updateData);

    if (result.success) {
        let timeStr = "";
        if (args.check_in_at && args.check_out_at) {
            timeStr = `\n⏰ In: ${args.check_in_at} → Out: ${args.check_out_at}`;
        } else if (args.check_in_at) {
            timeStr = `\n⏰ In: ${args.check_in_at}`;
        } else if (args.check_out_at) {
            timeStr = `\n⏰ Out: ${args.check_out_at}`;
        }

        return `✅ Updated attendance:\n👤 ${employeeName}\n📅 ${args.date}\n📋 Status: ${args.status}${timeStr}`;
    } else {
        return `❌ Failed to update attendance for ${employeeName}: ${result.error}`;
    }
}
