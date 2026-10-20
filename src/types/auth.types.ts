export interface SignupInput {
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
  otp: string;
}

export interface SendLoginOtpInput {
  email: string;
  password: string;
}