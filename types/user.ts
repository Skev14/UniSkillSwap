import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  skillsOffered: string[];
  skillsNeeded: string[];
  availability: string;
  bio: string;
  createdAt: Timestamp;
  photoURL?: string; // Optional for now
}

// Pre-defined skills for dropdown selection
export const AVAILABLE_SKILLS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Programming",
  "Python",
  "Java",
  "JavaScript",
  "React",
  "Web Development",
  "Mobile Development",
  "Writing",
  "English",
  "Essay Writing",
  "Research",
  "Study Skills",
  "Time Management",
  "Public Speaking",
  "Presentation Skills"
];

// Pre-defined availability options
export const AVAILABILITY_OPTIONS = [
  "Weekdays",
  "Weekends",
  "Mornings",
  "Afternoons",
  "Evenings",
  "Flexible"
]; 