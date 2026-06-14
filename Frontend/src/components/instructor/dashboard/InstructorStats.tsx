import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Users, Video, TrendingUp,
  UserCheck, ArrowUpRight, ArrowDownRight,
  Zap,
} from "lucide-react";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  iconColor: string;
  change: string;
  trend: string;
  positive: boolean;
  suffix?: string;
}

interface InstructorStatsProps {
  coursesCount: number;
  stats?: {
    totalStudents: number;
    contentItems: number;
    avgCompletion: number;
    activeStudents?: number;
    pendingAssignments?: number;
    upcomingClasses?: number;
    avgRating?: number;
  };
  loading?: boolean;
}

function AnimatedCounter({ to, duration = 1.6, suffix = "" }: { to: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * to));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [to, duration]);

  return <>{count.toLocaleString()}{suffix}</>;
}

const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
  },
};

export function InstructorStats({ coursesCount, stats, loading }: InstructorStatsProps) {
  const cards: StatCard[] = [
    {
      title: "Total Courses",
      value: coursesCount,
      icon: BookOpen,
      gradient: "from-blue-500/10 via-blue-400/5 to-transparent",
      iconBg: "bg-blue-500",
      iconColor: "text-white",
      change: "Published",
      trend: "+2 this month",
      positive: true,
    },
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      icon: Users,
      gradient: "from-violet-500/10 via-violet-400/5 to-transparent",
      iconBg: "bg-violet-500",
      iconColor: "text-white",
      change: "Active enrollments",
      trend: "+12%",
      positive: true,
    },
    {
      title: "Active Students",
      value: stats?.activeStudents ?? (stats?.totalStudents ?? 0),
      icon: UserCheck,
      gradient: "from-emerald-500/10 via-emerald-400/5 to-transparent",
      iconBg: "bg-emerald-500",
      iconColor: "text-white",
      change: "Last 7 days",
      trend: "+8%",
      positive: true,
    },
    {
      title: "Content Items",
      value: stats?.contentItems ?? 0,
      icon: Video,
      gradient: "from-orange-500/10 via-orange-400/5 to-transparent",
      iconBg: "bg-orange-500",
      iconColor: "text-white",
      change: "Videos & Resources",
      trend: "+5 new",
      positive: true,
    },
    {
      title: "Avg. Completion",
      value: stats?.avgCompletion ?? 0,
      icon: TrendingUp,
      gradient: "from-teal-500/10 via-teal-400/5 to-transparent",
      iconBg: "bg-teal-500",
      iconColor: "text-white",
      change: "Across all courses",
      trend: "+5%",
      positive: true,
      suffix: "%",
    },
  ];

  if (loading) {
    return (
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5">
            <Skeleton className="h-3 w-20 mb-4 rounded-full" />
            <Skeleton className="h-8 w-16 mb-2 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
    >
      {cards.map((card) => (
        <motion.div
          key={card.title}
          variants={itemVariants}
          whileHover={{ y: -3, transition: { duration: 0.2 } }}
          className="group relative bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-5 overflow-hidden cursor-default shadow-sm hover:shadow-md hover:border-slate-300/80 transition-all duration-300"
        >
          {/* Gradient Background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />

          <div className="relative z-10">
            {/* Icon + Trend */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-2 rounded-xl ${card.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                <card.icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
              <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                card.positive
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-red-50 text-red-600 border border-red-100"
              }`}>
                {card.positive
                  ? <ArrowUpRight className="h-3 w-3" />
                  : <ArrowDownRight className="h-3 w-3" />}
                {card.trend}
              </div>
            </div>

            {/* Value */}
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1.5">
              {typeof card.value === "number" ? (
                <AnimatedCounter to={card.value} suffix={card.suffix} />
              ) : (
                card.value
              )}
            </p>

            {/* Title */}
            <p className="text-xs font-semibold text-slate-500 leading-tight">{card.title}</p>

            {/* Sub-label */}
            <p className="text-[10px] text-slate-400 mt-1 font-medium">{card.change}</p>
          </div>

          {/* Bottom glow line */}
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${card.iconBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full`} />
        </motion.div>
      ))}
    </motion.div>
  );
}