export interface AdminCredentials {
  username: string;
  password?: string;
}

export interface HistoryConfig {
  title: string;
  subtitle: string;
  content: string; // "Nossa História"
  about: string; // "Sobre o Grupo"
  homenagemText: string;
  homenagemNames: string[];
  bannerUrl: string;
  mission?: string; // kept for backwards compatibility
  values?: string; // kept for backwards compatibility
}

export interface TimelineEvent {
  id: string;
  year: string;
  title: string;
  description: string;
}

export interface StatisticItem {
  id: string;
  label: string;
  value: string;
  icon: string;
}

export interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  date: string;
  category?: string;
  badgeIcon?: string;
  description?: string;
}

export interface QuestionItem {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface SubmissionItem {
  id: string;
  name: string;
  discordTag: string;
  age: string;
  passport: string; // Changed from phone
  phone?: string; // Kept as optional for legacy compatibility
  answers: number[];
  score: number;
  timestamp: string;
  passed: boolean;
}

export interface PortalData {
  discordWebhook: string;
  history: HistoryConfig;
  timeline: TimelineEvent[];
  statistics: StatisticItem[];
  gallery: GalleryItem[];
  questions: QuestionItem[];
  submissions: SubmissionItem[];
}
