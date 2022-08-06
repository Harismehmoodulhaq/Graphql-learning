import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Resolver, Mutation, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import argon2 from "argon2";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { RegisterParams } from "../utils/RegisterParams";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";
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
        @Ctx() { redis, em, req }: MyContext
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

        const user = await em.findOne(User, {id: parseInt(userId)});

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

        user.password = await argon2.hash(newPassword);
        await em.persistAndFlush(user);

        await redis.del(key)

        req.session.userId = user.id;

        return { user };

    }

    @Mutation(() => Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() { em, redis }: MyContext
    ) {
        const user = await em.findOne(User, { email });
        if (!user) {
            return true;
        }

        const token = v4();
        redis.set(FORGOT_PASSWORD_PREFIX + token, user.id, 'EX', 1000 * 60 * 60 * 24 * 1)

        await sendEmail(
            email,
            `<a href="http://localhost:3000/change-password/${token}">Reset Password</a>`
        )

        return true;
    }

    @Query(() => User, { nullable: true })
    async me(
        @Ctx() { req, em }: MyContext
    ) {

        console.log("session: ", req.session)

        if (!req.session.userId) {
            return null;
        }

        const user = await em.findOne(User, { id: req.session.userId });
        return user
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg("register") register: RegisterParams,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {

        const errors = validateRegister(register);
        if (errors) {
            return { errors }
        }

        const hashedPassword = await argon2.hash(register.password)
        const user = em.create(User, { username: register.username, email: register.email as string, gender: register.gender as string, password: hashedPassword as string } as User);
        try {
            await em.persistAndFlush(user);
        } catch (error) {
            console.log(`message: ${error.code}`)
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
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {

        // const user = await em.findOne(User, { username: login.username });
        let user;
        try {
            user = await em.findOne(User, usernameOrEmail.includes('@') ? { email: usernameOrEmail } : { username: usernameOrEmail });
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