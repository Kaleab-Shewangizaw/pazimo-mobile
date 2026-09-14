import type { RsvpAnswer, RsvpForm, RsvpQuestion } from '@/types/api';

/** Loose on purpose — this only gates the "Continue" button, the server has the real check. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s-]{7,}$/;

export function sortedSections(form: RsvpForm) {
  return [...form.sections].sort((a, b) => a.order - b.order);
}

export function questionsForSection(form: RsvpForm, sectionId: string): RsvpQuestion[] {
  return form.questions
    .filter((question) => question.sectionId === sectionId)
    .sort((a, b) => a.order - b.order);
}

/** A `conditional` question only counts — for display or validation — once its trigger question resolves true. */
export function isQuestionVisible(
  question: RsvpQuestion,
  answers: Record<string, RsvpAnswer>,
): boolean {
  const condition = question.conditional;
  if (!condition) return true;

  const raw = answers[condition.questionId];
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(value)) return false;

  if (condition.operator === 'lt') return value < condition.value;
  if (condition.operator === 'eq') return value === condition.value;
  return value > condition.value;
}

function isEmptyAnswer(value: RsvpAnswer): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Null when the answer is fine to submit, otherwise the message to show under the field. */
export function questionProblem(question: RsvpQuestion, value: RsvpAnswer): string | null {
  if (question.required && isEmptyAnswer(value)) return 'This is required.';
  if (isEmptyAnswer(value)) return null;

  if (question.type === 'email' && typeof value === 'string' && !EMAIL_RE.test(value.trim())) {
    return 'Enter a valid email address.';
  }
  if (question.type === 'phone' && typeof value === 'string' && !PHONE_RE.test(value.trim())) {
    return 'Enter a valid phone number.';
  }
  return null;
}

export type Attendee = { fullName: string; email: string; phone: string };

/** Mirrors the server's attendee-info requirement — only asked for when `collectAttendeeInfo` is on. */
export function attendeeProblems(attendee: Attendee): Partial<Record<keyof Attendee, string>> {
  const problems: Partial<Record<keyof Attendee, string>> = {};
  if (attendee.fullName.trim().length < 2) problems.fullName = 'Enter your full name.';
  if (!EMAIL_RE.test(attendee.email.trim())) problems.email = 'Enter a valid email address.';
  if (!PHONE_RE.test(attendee.phone.trim())) problems.phone = 'Enter a valid phone number.';
  return problems;
}
