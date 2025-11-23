# Natsuki Attendance System

A comprehensive Attendance and Shift Management System built with Next.js, Supabase, and Tailwind CSS.

## Features

- **Attendance Tracking**: Clock in/out functionality for employees and students.
- **Shift Management**: Admin tools to assign and view shifts.
- **Admin Dashboard**: Manage students, employees, and view attendance logs.
- **Kiosk Mode**: Public-facing interface for quick attendance logging.
- **Supabase Integration**: Real-time data and secure authentication.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Supabase project

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/evanclan/natsuki-attendance.git
    cd natsuki-attendance
    ```

2.  Install dependencies:
    ```bash
    cd app
    npm install
    ```

3.  Set up environment variables:
    Create a `.env.local` file in the `app` directory with your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  Run the development server:
    ```bash
    npm run dev
    ```

    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- \`app/\`: Next.js application source code.
- \`supabase/\`: Supabase configuration and migrations.
- \`*.sql\`: SQL scripts for database setup and maintenance.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[MIT](https://choosealicense.com/licenses/mit/)
