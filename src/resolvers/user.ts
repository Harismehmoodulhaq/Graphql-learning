import argon2 from "argon2";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import { getConnection } from "typeorm";
import { v4 } from "uuid";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/User";
import { RegisterParams } from "../utils/RegisterParams";
import { sendEmail } from "../utils/sendEmail";
import { validateRegister } from "../utils/validateRegister";
@ObjectType()
class FieldError {

    @Field()
    field: string;

    @Field()
    message: string;
}

@ObjectType()
class UserResponse {
    @Field(() => [FieldError], { nullable: true })
    errors?: FieldError[]

    @Field(() => User, { nullable: true })
    user?: User
}


@Resolver()
export class UserResolver {

    @Mutation(() => UserResponse)
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() { redis, req }: MyContext
    ): Promise<UserResponse> {
        if (newPassword.length <= 8) {
            return {
                errors: [
                    {
                        field: "newPassword",
                        message: "length must be greater then and equal to 8"
                    },
                ],
            };
        };

        const key = FORGOT_PASSWORD_PREFIX + token;

        const userId = await redis.get(key);
        if (!userId) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "token expired"
                    },
                ],
            };
        };
        const userIdNum = parseInt(userId)
        const user = await User.findOne(userIdNum);

        if (!user) {
            return {
                errors: [
                    {
                        field: "token",
                        message: "user no longer exist",
                    },
                ],
            };
        };

        User.update(
            { id: userIdNum },
            {
                password: await argon2.hash(newPassword)
            }
        )

        await redis.del(key)

        req.session.userId = user.id;

        return { user };

    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { redis }: MyContext
    ) {
        const user = await User.findOne({where: { email }});
        if (!user) {
            return true;
        }

        const token = v4();
       await redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'EX', 1000 * 60 * 60 * 24 * 1)

        await sendEmail(
            email,
            `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`
        )

        return true;
    }

    @Query(() => User, { nullable: true })
    me(
        @Ctx() { req }: MyContext
    ) {
        let request = req.session.userId
        if (!request) {
            return null;
        }

        return User.findOne(request)
        
}

    @Mutation(() => UserResponse)
    async register(
        @Arg("register") register: RegisterParams,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {

        const errors = validateRegister(register);
        if (errors) {
            return { errors }
        }

        const hashedPassword = await argon2.hash(register.password)
        let user;   
        try {
           const result = await getConnection().createQueryBuilder().insert().into(User).values({
                username: register.username,
                password: hashedPassword,
                gender: register.gender,
                email: register.email
            }).returning('*').execute()
            console.log("result: ", result)
            user = result.raw[0];
        } catch (error) {
            console.log('error: ', error)
            if (error.code === "23505") { //! || error.detail.includes("already exists")) {
                return {
                    errors: [{
                        field: "username",
                        message: "username already taken",
                    }]
                }
            }

        }
        req.session!.userId = user.id
        return { user };

    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("usernameOrEmail") usernameOrEmail: string,
        @Arg("password") password: string,
        @Ctx() { req }: MyContext
    ): Promise<UserResponse> {

        // const user = await em.findOne(User, { username: login.username });
        let user;
        try {
            user = await User.findOne(
                usernameOrEmail.includes('@')
                    ? { where: {email: usernameOrEmail} } 
                    : { where: {username: usernameOrEmail} }
                );
        } catch (e) {
            console.log(e)
        }

        if (!user) {
            return {
                errors: [{
                    field: 'usernameOrEmail',
                    message: "that usernameOrEmail doesn't exist"
                }]
            }
        }

        const valid = await argon2.verify(user.password, password);

        if (!valid) {
            return {
                errors: [
                    {
                        field: 'password',
                        message: "incorrect password"
                    }
                ]
            }
        }

        req.session!.userId = user.id

        return {
            user,
        };

    }

    @Mutation(() => Boolean)
    logout(
        @Ctx() { req, res }: MyContext
    ) {
        return new Promise((resolver) => req.session.destroy((err) => {
            res.clearCookie(COOKIE_NAME)
            if (err) {
                resolver(false)
                return
            }
            resolver(true)
        }))
    }
}


// s%3AyROoN2lim3K5kKsTEG3nNLCRMi47-msp.I9O1aWUdXsRS1LxHUatPYhGchy7pRcTA0k5i9Rl30jU