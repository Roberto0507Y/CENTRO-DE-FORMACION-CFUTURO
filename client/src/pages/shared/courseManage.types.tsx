export type CourseManageOutletContext = {
  courseId: number;
  courseTitle: string;
  courseSlug?: string;
  base?: "admin" | "teacher" | "student";
  admissionOnly?: boolean;
};
