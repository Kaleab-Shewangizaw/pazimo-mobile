import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '@/api/client';
import { submitRsvpResponse } from '@/api/rsvp';
import { AttendeeStep } from '@/components/rsvp/attendee-step';
import { ConfirmationScreen } from '@/components/rsvp/confirmation-screen';
import { QuestionInput } from '@/components/rsvp/question-input';
import { Button } from '@/components/ui/button';
import { GlassButton } from '@/components/ui/glass-button';
import { ErrorState } from '@/components/ui/state-views';
import { Text } from '@/components/ui/text';
import { AspectRatio, Radius, Spacing } from '@/constants/theme';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { resolveImageUrl } from '@/lib/media';
import {
  type Attendee,
  attendeeProblems,
  isQuestionVisible,
  questionProblem,
  questionsForSection,
  sortedSections,
} from '@/lib/rsvp';
import { useRsvpForm } from '@/queries/rsvp';
import { useAuthStore } from '@/stores/use-auth-store';
import type { RsvpAnswer, RsvpResponse } from '@/types/api';

/** Matches the buy bar's own footprint on the event detail page — a `lg` Button plus its bar padding. */
const CTA_BAR_HEIGHT = Spacing.md + Spacing.lg * 2 + 22;

type Step = { kind: 'attendee' } | { kind: 'section'; id: string; title: string };

export default function RsvpScreen() {
  const { publicId } = useLocalSearchParams<{ publicId: string }>();
  const theme = useTheme();
  const goBack = useGoBack();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  const { data: form, isLoading, isError, error, refetch } = useRsvpForm(publicId);

  const [stepIndex, setStepIndex] = useState(0);
  // Prefilled from the account like checkout does, but never required to be
  // signed in — the submit endpoint takes no auth at all.
  const [attendee, setAttendee] = useState<Attendee>({
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim(),
    email: user?.email?.includes('customerpazimo') ? '' : (user?.email ?? ''),
    phone: user?.phoneNumber ?? '',
  });
  const [answers, setAnswers] = useState<Record<string, RsvpAnswer>>({});
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Once set, this replaces the wizard entirely — there is no guest-side edit/cancel to come back to.
  const [response, setResponse] = useState<RsvpResponse | null>(null);

  const steps = useMemo<Step[]>(() => {
    if (!form) return [];
    const list: Step[] = [];
    if (form.collectAttendeeInfo) list.push({ kind: 'attendee' });
    for (const section of sortedSections(form)) {
      list.push({ kind: 'section', id: section.id, title: section.title });
    }
    return list;
  }, [form]);

  const currentStep = steps[stepIndex] ?? null;
  const sectionQuestions =
    form && currentStep?.kind === 'section'
      ? questionsForSection(form, currentStep.id).filter((q) => isQuestionVisible(q, answers))
      : [];
  const isLastStep = stepIndex >= steps.length - 1;

  const setAnswer = (questionId: string, value: RsvpAnswer) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const stepInvalid = currentStep
    ? currentStep.kind === 'attendee'
      ? Object.keys(attendeeProblems(attendee)).length > 0
      : sectionQuestions.some((q) => questionProblem(q, answers[q.id] ?? null) !== null)
    : false;

  const submit = async () => {
    if (!form) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await submitRsvpResponse(form.publicId, {
        answers,
        attendee: form.collectAttendeeInfo
          ? {
              fullName: attendee.fullName.trim(),
              email: attendee.email.trim(),
              phone: attendee.phone.trim(),
            }
          : { fullName: '', email: '', phone: '' },
      });
      setResponse(result);
    } catch (err) {
      setSubmitError(
        err instanceof ApiError ? err.message : "We couldn't submit your RSVP. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onContinue = () => {
    if (stepInvalid) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    if (isLastStep) {
      submit();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const onBack = () => {
    if (stepIndex === 0) {
      goBack();
      return;
    }
    setShowErrors(false);
    setStepIndex((i) => i - 1);
  };

  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  if (isError || !form) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ErrorState
          message={error instanceof ApiError ? error.message : undefined}
          onRetry={() => refetch()}
        />
      </View>
    );
  }

  if (form.status !== 'published' || !form.isPublic || form.isClosed) {
    return (
      <View style={[styles.screen, styles.centered, { backgroundColor: theme.background }]}>
        <ErrorState message="This RSVP isn't open right now." />
      </View>
    );
  }

  if (response) {
    return (
      <View style={[styles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.lg }}>
          <ConfirmationScreen response={response} onDone={goBack} />
        </ScrollView>
      </View>
    );
  }

  const cover = resolveImageUrl(form.coverImage);
  const facts = [form.date, form.startTime, form.venue || form.location, form.hostedBy]
    .filter(Boolean)
    .join(' · ');

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <GlassButton label="Back" icon="chevron-back" accessibilityLabel="Go back" onPress={onBack} />
        <View style={[styles.progressTrack, { backgroundColor: theme.glassBorder }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((stepIndex + 1) / Math.max(steps.length, 1)) * 100}%`,
                backgroundColor: theme.brand,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + CTA_BAR_HEIGHT + Spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={180} />
        ) : null}

        <View style={styles.intro}>
          <Text variant="heading">{form.title}</Text>
          {facts ? (
            <Text variant="small" color="textSecondary">
              {facts}
            </Text>
          ) : null}
        </View>

        {steps.length === 0 ? (
          <Text variant="body" color="textSecondary" style={styles.noFields}>
            No further details are needed — just confirm below.
          </Text>
        ) : currentStep?.kind === 'attendee' ? (
          <AttendeeStep
            attendee={attendee}
            onChange={(patch) => setAttendee((current) => ({ ...current, ...patch }))}
            errors={showErrors ? attendeeProblems(attendee) : {}}
          />
        ) : currentStep?.kind === 'section' ? (
          <View style={styles.questionStack}>
            {currentStep.title ? <Text variant="title">{currentStep.title}</Text> : null}
            {sectionQuestions.map((question) => (
              <QuestionInput
                key={question.id}
                question={question}
                value={answers[question.id] ?? null}
                onChange={(value) => setAnswer(question.id, value)}
                error={showErrors ? questionProblem(question, answers[question.id] ?? null) : null}
              />
            ))}
          </View>
        ) : null}

        {submitError ? (
          <Text variant="caption" color="danger" style={styles.centered}>
            {submitError}
          </Text>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.ctaBar,
          { paddingBottom: insets.bottom + Spacing.md, borderTopColor: theme.glassBorder },
        ]}>
        <Button
          label={isLastStep ? 'Submit RSVP' : 'Continue'}
          onPress={onContinue}
          loading={submitting}
          size="lg"
          style={styles.ctaButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', textAlign: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  progressTrack: { flex: 1, height: 4, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill },

  content: { paddingHorizontal: Spacing.lg, gap: Spacing.xl },
  cover: {
    width: '100%',
    aspectRatio: AspectRatio.card,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  intro: { gap: Spacing.xs },
  noFields: { paddingVertical: Spacing.xl },
  questionStack: { gap: Spacing.lg },

  ctaBar: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: { width: '100%' },
});
