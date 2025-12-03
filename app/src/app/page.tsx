"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Users, Calendar, Clock, ShieldCheck, Globe } from "lucide-react";
import { useState } from "react";

type Language = "ja" | "en";

const translations = {
  ja: {
    title: "Natsuki APP v1.0",
    adminLogin: "管理者ログイン",
    openKiosk: "キオスクを開く",
    heroTagline: "保育園運営の現代的なソリューション",
    heroTitle1: "出席管理と",
    heroTitle2: "スタッフ配置を効率化",
    heroDesc: "生徒のチェックイン、従業員のシフト、日々の業務を、現代の保育園向けに設計されたシステムで簡単に管理できます。",
    getStarted: "始める",
    launchKiosk: "キオスクモードを起動",
    features: {
      student: {
        title: "生徒管理",
        desc: "生徒のプロフィール、緊急連絡先、日々の出席記録を追跡します。",
      },
      scheduling: {
        title: "スマートなスケジュール管理",
        desc: "直感的なドラッグアンドドロップのカレンダーインターフェイスで、従業員のシフトを作成および管理します。",
      },
      tracking: {
        title: "リアルタイム追跡",
        desc: "正確な給与計算のために、スタッフの勤務時間、残業、出席をリアルタイムで監視します。",
      },
      checkin: {
        title: "簡単チェックイン",
        desc: "保護者が子供を素早くチェックインおよびチェックアウトできるシームレスなキオスクモード。",
      },
      secure: {
        title: "安全で信頼できる",
        desc: "重要な生徒および従業員のデータを保護するために、セキュリティを考慮して構築されています。",
      },
      more: {
        title: "その他多数...",
        desc: "包括的なレポート、通知、カスタマイズ可能な設定。",
      },
    },
    footer: "Created and licensed by RaJA IT department - www.evanserv.com",
  },
  en: {
    title: "Natsuki APP v1.0",
    adminLogin: "Admin Login",
    openKiosk: "Open Kiosk",
    heroTagline: "The Modern Solution for Child Care Management",
    heroTitle1: "Streamline Your Attendance &",
    heroTitle2: "Staffing",
    heroDesc: "Effortlessly manage student check-ins, employee shifts, and daily operations with a system designed for modern child care centers.",
    getStarted: "Get Started",
    launchKiosk: "Launch Kiosk Mode",
    features: {
      student: {
        title: "Student Management",
        desc: "Keep track of student profiles, emergency contacts, and daily attendance records.",
      },
      scheduling: {
        title: "Smart Scheduling",
        desc: "Create and manage employee shifts with an intuitive drag-and-drop calendar interface.",
      },
      tracking: {
        title: "Real-time Tracking",
        desc: "Monitor staff hours, overtime, and attendance in real-time for accurate payroll.",
      },
      checkin: {
        title: "Easy Check-in",
        desc: "Seamless kiosk mode for parents to check their children in and out quickly.",
      },
      secure: {
        title: "Secure & Reliable",
        desc: "Built with security in mind to protect sensitive student and employee data.",
      },
      more: {
        title: "And much more...",
        desc: "Comprehensive reporting, notifications, and customizable settings.",
      },
    },
    footer: "Created and licensed by RaJA IT department - www.evanserv.com",
  },
};

export default function Home() {
  const [lang, setLang] = useState<Language>("ja");
  const t = translations[lang];

  const toggleLanguage = () => {
    setLang((prev) => (prev === "ja" ? "en" : "ja"));
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <ShieldCheck className="h-6 w-6" />
            <span>{t.title}</span>
          </div>
          <nav className="flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Globe className="h-4 w-4" />
              {lang === "ja" ? "English" : "日本語"}
            </button>
            <Link
              href="/login"
              className="text-sm font-medium hover:text-primary transition-colors hidden sm:inline-block"
            >
              {t.adminLogin}
            </Link>
            <Link
              href="/kiosk"
              className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t.openKiosk}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto flex flex-col items-center justify-center gap-6 py-24 text-center px-4 sm:px-8 md:py-32">
          <div className="rounded-2xl bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">
            {t.heroTagline}
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl">
            {t.heroTitle1} <span className="text-primary">{t.heroTitle2}</span>
          </h1>
          <p className="max-w-[42rem] leading-normal text-muted-foreground sm:text-xl sm:leading-8">
            {t.heroDesc}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:gap-6 mt-4">
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t.getStarted} <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link
              href="/kiosk"
              className="inline-flex h-12 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {t.launchKiosk}
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto py-16 px-4 sm:px-8 md:py-24 lg:py-32 bg-muted/50 rounded-3xl my-8">
          <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Users className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">{t.features.student.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features.student.desc}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Calendar className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">{t.features.scheduling.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features.scheduling.desc}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <Clock className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">{t.features.tracking.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features.tracking.desc}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <CheckCircle2 className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">{t.features.checkin.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features.checkin.desc}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <ShieldCheck className="h-12 w-12 text-primary" />
                <div className="space-y-2">
                  <h3 className="font-bold">{t.features.secure.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features.secure.desc}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-lg border bg-background p-2">
              <div className="flex h-[180px] flex-col justify-between rounded-md p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                  <span className="text-2xl font-bold text-primary">+</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold">{t.features.more.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t.features.more.desc}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto flex flex-col items-center justify-center gap-4 md:h-24 px-4 sm:px-8">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            {t.footer}
          </p>
        </div>
      </footer>
    </div>
  );
}
