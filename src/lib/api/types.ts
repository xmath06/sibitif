// Tipe respons API (sesuai kontrak backend di AGENTS.md).
// Beberapa endpoint mengembalikan array/objek mentah (tanpa {success,data}).

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}
export interface ApiErrorShape {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';
export type Religion =
  | 'ISLAM'
  | 'KRISTEN'
  | 'KATOLIK'
  | 'HINDU'
  | 'BUDDHA'
  | 'KONGHUCU'
  | 'OTHER';

export type QuestionType = 'MCQ' | 'ESSAY' | 'TRUE_FALSE' | 'POLY_CHOICE' | 'MULTI_SELECT' | 'URAIAN_PENDEK';
export type StudentExamStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'WAITING_GRADING'
  | 'COMPLETED';
  export type ScheduleStatus = 'SCHEDULED' | 'ON_GOING' | 'PAUSED' | 'ENDED';
export type TargetType = 'ALL_STUDENTS' | 'BY_CLASS' | 'BY_GRADE' | 'SPECIFIC_STUDENTS';

export interface SafeUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  classId: string | null;
  religion: Religion | null;
}

export interface Timer {
  hasTimer: boolean;
  remainingSeconds: number | null;
  elapsedSeconds: number | null;
  totalSeconds: number | null;
  expired: boolean;
  startedAt: string | null;
  deadlineAt: number | null;
}

export interface QuestionOption {
  id: string;
  optionText: string;
}

export interface Question {
  id: string;
  questionText: string;
  questionType: QuestionType;
  minWordCount?: number | null;
  maxWordCount?: number | null;
  answerKey?: string | null;
  options: QuestionOption[];
  savedAnswers?: {
    selectedOptionId?: string | null;
    essayAnswer?: string | null;
    isFlagged?: boolean;
  }[];
}

export interface ExamSchedule {
  id: string;
  title: string;
  category?: string | null;
  accessCodeRequired: boolean;
  showResultImmediately: boolean;
  status: ScheduleStatus;
  timeExtensionMinutes: number;
}

export interface ExamPackage {
  id: string;
  title: string;
  hasTimer: boolean;
  durationMinutes: number | null;
  passScore: string | null;
  totalQuestions: number;
}

export interface StartExamResponse {
  studentExamId: string;
  schedule: ExamSchedule;
  package: ExamPackage;
  timer: Timer;
  questions: Question[];
}

export interface MonitorStatus {
  scheduleId: string;
  title: string;
  category: string;
  scheduleStatus: ScheduleStatus;
  isActive: boolean;
  hasTimer: boolean;
  durationMinutes: number | null;
  timeExtensionMinutes: number;
  totalAllocated: number;
  startedCount: number;
  submittedCount: number;
  inProgressCount: number;
  remainingSeconds: number | null;
  elapsedSeconds: number | null;
  totalSeconds: number | null;
  deadlineAt: number | null;
  classroomClock: {
    anchorAt: number | null;
    remainingSeconds: number | null;
    elapsedSeconds: number | null;
    started: boolean;
  };
  motivation: string;
  updatedAt: string;
}
