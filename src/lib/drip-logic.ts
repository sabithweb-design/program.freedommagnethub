import { Timestamp } from "firebase/firestore";

/**
 * Calculates the current day of the training program (1-indexed).
 * If the cohort hasn't started yet, returns 0.
 */
export function calculateCurrentDay(cohortStartDate: Timestamp | Date | number): number {
  const start = cohortStartDate instanceof Timestamp 
    ? cohortStartDate.toDate() 
    : new Date(cohortStartDate);
  
  const now = new Date();
  
  // Set times to midnight for clean day calculation
  start.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Day 1 starts on the cohortStartDate
  return diffDays >= 0 ? diffDays + 1 : 0;
}

export function isLessonUnlocked(dayNumber: number, currentDay: number): boolean {
  return dayNumber <= currentDay;
}