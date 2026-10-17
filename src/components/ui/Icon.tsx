import {
  Activity, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bed, Bell,
  Brain, BrainCircuit, BriefcaseMedical, CalendarDays, CalendarCheck,
  CalendarClock, CalendarX, Check, CircleAlert, CircleCheck, CircleHelp,
  Clock3, CreditCard, FileText, Frown, Heart, HeartPulse, Hospital, House,
  Inbox, Info, LayoutDashboard, LocateFixed, LockKeyhole, LogOut, Mail, MapPin, Menu, Meh,
  MessageSquareQuote, Microscope, Navigation, NotebookPen, Pill, Plus,
  Quote, RefreshCw, Search, Send, Settings, Shield, ShieldCheck, ShieldUser,
  Siren, Smile, Stethoscope, Star, Stars, Thermometer, UserRound,
  UserSearch, Users, Video, Wind, Utensils, PersonStanding, X, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "./cn";

/**
 * Local SVG icon set. The former implementation rendered Material Symbols
 * ligatures and relied on a Google Fonts request, so blocked/offline font
 * downloads left blank icons (or visible ligature names). These SVGs ship with
 * the frontend bundle and render consistently on every route.
 */
const ICONS: Record<string, LucideIcon> = {
  add: Plus,
  admin_panel_settings: ShieldUser,
  arrow_back: ArrowLeft,
  arrow_forward: ArrowRight,
  badge: BadgeCheck,
  block: Shield,
  calendar_month: CalendarDays,
  cancel: CircleAlert,
  check: Check,
  check_circle: CircleCheck,
  chevron_right: ChevronRight,
  close: X,
  description: FileText,
  dashboard: LayoutDashboard,
  directions: Navigation,
  edit: NotebookPen,
  edit_note: NotebookPen,
  error: CircleAlert,
  event: CalendarDays,
  event_available: CalendarCheck,
  event_busy: CalendarX,
  favorite: Heart,
  format_quote: MessageSquareQuote,
  groups: Users,
  healing: Activity,
  health_and_safety: ShieldCheck,
  history: Clock3,
  inbox: Inbox,
  home: House,
  home_health: House,
  home_pin: MapPin,
  hourglass_top: CalendarClock,
  info: Info,
  local_dining: Utensils,
  local_hospital: Hospital,
  location_on: MapPin,
  lock: LockKeyhole,
  logout: LogOut,
  looks_one: BadgeCheck,
  mail: Mail,
  medical_information: FileText,
  medical_services: Stethoscope,
  medication: Pill,
  menu: Menu,
  model_training: BrainCircuit,
  monitoring: Activity,
  monitor_heart: HeartPulse,
  my_location: LocateFixed,
  neurology: Brain,
  notifications_active: Bell,
  payments: CreditCard,
  person: UserRound,
  person_search: UserSearch,
  person_standing: PersonStanding,
  receipt_long: FileText,
  refresh: RefreshCw,
  restaurant: Utensils,
  respiratory_rate: Wind,
  schedule: Clock3,
  school: NotebookPen,
  search: Search,
  send: Send,
  settings: Settings,
  shield_person: ShieldUser,
  star: Star,
  stars: Stars,
  stethoscope: Stethoscope,
  stomach: Activity,
  thermostat: Thermometer,
  trending_up: Activity,
  today: CalendarCheck,
  undo: ArrowLeft,
  verified: BadgeCheck,
  verified_user: ShieldCheck,
  videocam: Video,
  work_history: BriefcaseMedical,
  bedtime: Bed,
  accessibility_new: PersonStanding,
  sick: Activity,
  sentiment_satisfied: Smile,
  sentiment_very_satisfied: Smile,
  sentiment_neutral: Meh,
  sentiment_very_dissatisfied: Frown,
  quote: Quote,
  search_off: Search,
  arrow_up_right: ArrowUpRight,
  emergency: Siren,
};

export function Icon({
  name,
  fill = false,
  className,
}: {
  name: string;
  fill?: boolean;
  className?: string;
}) {
  const Glyph = ICONS[name] ?? CircleHelp;
  const canFill = fill && ["favorite", "star", "stars"].includes(name);

  return (
    <Glyph
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block h-[1em] w-[1em] shrink-0 align-middle", className)}
      strokeWidth={1.9}
      fill={canFill ? "currentColor" : "none"}
    />
  );
}
