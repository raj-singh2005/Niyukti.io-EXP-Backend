export interface CreateStudentProfileInput {
  fullName: string;
  collegeName: string;
  degree: string;
  major: string;
  graduationYear: number;
  interestSummary: string;
  skills: string[];
}

export interface CreateMentorProfileInput {
  fullName: string;
  currentCompany: string;
  designation: string;
  yearsOfExperience: number;
  expertise: string[];
  linkedinUrl: string;
}

export interface StudentProfileFiles {
  avatar?: Express.Multer.File;
  resume?: Express.Multer.File;
}

export interface MentorProfileFileFields {
  avatar?: Express.Multer.File[];
  resume?: Express.Multer.File[];
}

export interface StudentProfileFileFields {
  avatar?: Express.Multer.File[];
  resume?: Express.Multer.File[];
}
