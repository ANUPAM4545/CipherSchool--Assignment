import { notFound } from 'next/navigation';
import { getAppContainer } from '@/infrastructure/di/container';
import PracticeWorkspace from '@/components/PracticeWorkspace';

export const revalidate = 0; // Fresh fetch on every navigation

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function ProblemPracticePage({ params }: PageProps) {
  const container = await getAppContainer();

  let problem;
  try {
    problem = await container.getProblem.execute(params.slug);
  } catch {
    notFound();
  }

  const learnerId = 'default-learner';

  // Fetch attempt history
  const history = await container.getAttemptHistory.execute(problem.id, learnerId);

  // If no attempts exist, create Attempt #1
  let currentAttempt;
  if (history.length === 0) {
    currentAttempt = await container.startAttempt.execute({
      problemId: problem.id,
      learnerId,
    });
    history.push(currentAttempt);
  } else {
    // Get the latest attempt
    currentAttempt = history[history.length - 1];
  }

  return (
    <PracticeWorkspace
      problem={problem.toClientJSON() as any}
      initialAttempt={currentAttempt.toJSON() as any}
      initialHistory={history.map((a) => a.toJSON() as any)}
    />
  );
}
