import { RegisterParams } from "./RegisterParams"

export const validateRegister = (register: RegisterParams) => {
    if (register.username.length <= 3) {
        return [
            {
                field: "username",
                message: "length must be greater then and equal to 3"
            }
        ];
    }

    if (register.username.includes('@')) {
        return [
            {
                field: "username",
                message: "cannot include an @"
            }
        ];
    }

    if (register.password.length <= 8) {
        return [
            {
                field: "password",
                message: "length must be greater then and equal to 8"
            }
        ];
    }
    if (register.gender.length <= 3) {
        return [
            {
                field: "gender",
                message: "Please enter your gender"
            }
        ];
    }

    if (!register.email.includes('@')) {
        return [
            {
                field: "email",
                message: "Please enter your working Email"
            }
        ];
    }

    return null

}