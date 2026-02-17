import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { selectionAsync, impactLight } from '@/utils/haptics';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';

interface FeedbackData {
  conversationScore: number;
  emotionalScore: number;
  interestsScore: number;
  chemistryScore: number;
  valuesScore: number;
  overallRating: number;
  bestPart: string;
  worstPart: string;
  chemistryText: string;
}

interface Props {
  otherUserName: string;
  onSubmit: (data: FeedbackData) => void;
  loading?: boolean;
}

type Step = 'overall' | 'conversation' | 'emotional' | 'interests' | 'chemistry' | 'values' | 'bestPart' | 'worstPart' | 'chemistryText';

const STEPS: Step[] = ['overall', 'conversation', 'emotional', 'interests', 'chemistry', 'values', 'bestPart', 'worstPart', 'chemistryText'];

const PROMPTS: Record<Step, string> = {
  overall: 'Overall, how was the date?',
  conversation: 'How was the conversation?',
  emotional: 'Did you feel an emotional connection?',
  interests: 'How much did you have in common?',
  chemistry: 'Any spark or chemistry?',
  values: 'Did your values seem aligned?',
  bestPart: 'What was the best part?',
  worstPart: 'Anything that didn\'t click?',
  chemistryText: 'How was the chemistry specifically?',
};

const SUBTEXTS: Record<Step, string> = {
  overall: 'Drag the slider to rate your experience',
  conversation: 'Was it easy to talk? Did it flow naturally?',
  emotional: 'Did you feel understood? Any vulnerability?',
  interests: 'Overlapping hobbies, lifestyle, things you both enjoy',
  chemistry: 'Attraction, flirting, that feeling',
  values: 'Life goals, worldview, priorities',
  bestPart: 'Even if it wasn\'t great overall, what stood out?',
  worstPart: 'No pressure, but honesty helps the system learn',
  chemistryText: 'Describe the vibe in your own words',
};

function SliderControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const labels = ['Not great', 'Meh', 'Decent', 'Good', 'Amazing'];
  const labelIndex = Math.min(Math.floor(value * 5), 4);

  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.track}>
        <View style={[sliderStyles.fill, { width: `${value * 100}%` }]} />
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <TouchableOpacity
            key={i}
            style={[sliderStyles.tickZone, { left: `${tick * 100}%` }]}
            onPress={() => {
              onChange(tick);
              selectionAsync();
            }}
          />
        ))}
      </View>
      <View style={sliderStyles.labelRow}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => {
              onChange(tick);
              selectionAsync();
            }}
          >
            <Text style={[
              sliderStyles.tickLabel,
              value >= tick - 0.05 && value <= tick + 0.05 && sliderStyles.tickLabelActive,
            ]}>
              {labels[i]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={sliderStyles.valueText}>{(value * 10).toFixed(1)}/10</Text>
    </View>
  );
}

export function ConversationalFlow({ otherUserName, onSubmit, loading }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [scores, setScores] = useState({
    overall: 0.5,
    conversation: 0.5,
    emotional: 0.5,
    interests: 0.5,
    chemistry: 0.5,
    values: 0.5,
  });
  const [texts, setTexts] = useState({
    bestPart: '',
    worstPart: '',
    chemistryText: '',
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const step = STEPS[stepIndex];
  const isSliderStep = ['overall', 'conversation', 'emotional', 'interests', 'chemistry', 'values'].includes(step);
  const isTextStep = ['bestPart', 'worstPart', 'chemistryText'].includes(step);
  const isLastStep = stepIndex === STEPS.length - 1;

  const animateTransition = (next: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setStepIndex(next), 150);
  };

  const handleNext = () => {
    impactLight();
    if (isLastStep) {
      onSubmit({
        conversationScore: scores.conversation,
        emotionalScore: scores.emotional,
        interestsScore: scores.interests,
        chemistryScore: scores.chemistry,
        valuesScore: scores.values,
        overallRating: scores.overall,
        bestPart: texts.bestPart,
        worstPart: texts.worstPart,
        chemistryText: texts.chemistryText,
      });
    } else {
      animateTransition(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      selectionAsync();
      animateTransition(stepIndex - 1);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* progress */}
        <View style={styles.progressRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= stepIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>

        <Animated.View style={[styles.stepContent, { opacity: fadeAnim }]}>
          <Text style={styles.prompt}>
            {PROMPTS[step].replace('the date', `your date with ${otherUserName}`)}
          </Text>
          <Text style={styles.subtext}>{SUBTEXTS[step]}</Text>

          {isSliderStep && (
            <SliderControl
              value={scores[step as keyof typeof scores]}
              onChange={(v) => setScores(prev => ({ ...prev, [step]: v }))}
            />
          )}

          {isTextStep && (
            <TextInput
              style={styles.textInput}
              value={texts[step as keyof typeof texts]}
              onChangeText={(t) => setTexts(prev => ({ ...prev, [step]: t }))}
              placeholder="Type your thoughts..."
              placeholderTextColor={Colors.textTertiary}
              multiline
              textAlignVertical="top"
            />
          )}
        </Animated.View>

        {/* nav buttons */}
        <View style={styles.buttonRow}>
          {stepIndex > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextButton, loading && styles.buttonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const sliderStyles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  track: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  tickZone: {
    position: 'absolute',
    top: -16,
    width: 32,
    height: 40,
    marginLeft: -16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: Spacing.sm,
  },
  tickLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
  },
  tickLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  valueText: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.md,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceAlt,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
    minHeight: 250,
  },
  prompt: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  subtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  textInput: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.text,
    minHeight: 100,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  backButton: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backButtonText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
