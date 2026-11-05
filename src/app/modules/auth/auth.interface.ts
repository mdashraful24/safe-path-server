export interface IRegisterPayload {
	name: string;
	email: string;
	password: string;
}

export interface IVerifyEmailPayload {
	email: string;
	otp: string;
}

export interface IResendRegistrationOtpPayload {
	email: string;
}

export interface ILoginPayload {
	email: string;
	password: string;
}

export interface IForgotPasswordPayload {
	email: string;
}

export interface IResetPasswordPayload {
	email: string;
	otp: string;
	newPassword: string;
}

export interface IRestoreAccountRequestPayload {
	email: string;
}

export interface IVerifyAccountRestorePayload {
	email: string;
	otp: string;
}
