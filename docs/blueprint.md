# **App Name**: EduTrail

## Core Features:

- User Authentication & Authorization: Implement a secure login page supporting both Email/Password and Firebase Passwordless (Email Magic Link) methods. Protect all course routes, allowing access only to authenticated users and managing permissions based on user roles (student/admin).
- User Profile Management: Securely store user data in Firestore, including unique identifier (uid), email, assigned role (student/admin), and the critical 'cohortStartDate' timestamp required for drip content logic.
- Course Content Management: Establish a Firestore collection for 90-day lesson content, with each document storing 'dayNumber' (1-90), 'videoUrl', 'title', and 'descriptionText' for course administration.
- AI-Enhanced Lesson Description Tool: Utilize a generative AI tool to suggest or refine the 'descriptionText' for lessons based on provided titles or initial content, assisting content creators in rapidly generating rich lesson summaries.
- Drip Content Delivery & Security: Implement secure server-side logic that calculates a student's 'currentDay' based on their 'cohortStartDate'. Enforce content unlocking by restricting access to lessons where 'lesson.dayNumber' exceeds 'student.currentDay' and display a 'Content Locked' UI. Firestore Security Rules will prevent unauthorized queries.
- Student Course Dashboard: Provide students with an intuitive visual dashboard, presenting a grid view of all 90 program days. Clearly distinguish and enable navigation for unlocked days, while greyed-out items indicate future, inaccessible lessons.
- Dynamic Lesson Viewer: A dynamic route (e.g., /lesson/[dayNumber]) dedicated to displaying individual lesson content, including an embedded video player, lesson title, and detailed description, accessible only after the lesson is unlocked.

## Style Guidelines:

- Primary Color: A deep, professional indigo (#501FA3) chosen to convey trust and knowledge, providing a strong anchor for interactive elements and headings. Hue HSL(250, 70%, 40%).
- Background Color: A very light, desaturated grey-purple (#ECEDF2) to ensure content readability and maintain a clean, open aesthetic. Hue HSL(250, 20%, 95%).
- Accent Color: A vibrant yet professional blue (#3392FF) to highlight call-to-action buttons, key information, and interactive states, analogous to the primary color. Hue HSL(220, 80%, 60%).
- Body and Headline Font: 'Inter', a modern sans-serif typeface, to provide excellent readability across all text sizes and maintain a clean, objective aesthetic suitable for educational content.
- Utilize a consistent set of clean, modern line-art icons (e.g., Heroicons, Lucide) for navigation, content status (locked/unlocked), and interactive elements to maintain a professional and intuitive user experience.
- Implement a responsive and content-first layout using Tailwind CSS. The dashboard will feature a clear grid system, while lesson pages will offer a focused, uncluttered view for optimal learning, ensuring ample whitespace and intuitive content flow.
- Incorporate subtle and functional animations primarily for loading states, route transitions, and interactive feedback (e.g., button clicks, content unlocking) to enhance user perception of responsiveness without distracting from the educational content.