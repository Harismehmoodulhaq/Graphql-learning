import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Resolver, Mutation, InputType, Field, Arg, Ctx, ObjectType, Query } from "type-graphql";
import argon2 from "argon2";
import { COOKIE_NAME } from "../constants";
// import { session, SessionData } from "express-session";

@InputType()
class LoginParams {
    @Field()
    username: string

    @Field()
    password: string
}
@InputType()
class RegisterParams extends LoginParams {
    @Field()
    gender: string
}



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

    @Query(() => User, { nullable: true })
    async me(
        @Ctx() { req, em }: MyContext
    ) {

        console.log("session: ",req.session)

        if(!req.session.userId) {
            return null;
        }

        const user = await em.findOne(User, {id: req.session.userId});
        return user
    }

    @Mutation(() => UserResponse)
    async register(
        @Arg("register") register: RegisterParams,
        @Ctx() { em }: MyContext
    ): Promise<UserResponse> {

        if (register.username.length <= 3) {
            return {
                errors: [{
                    field: "username",
                    message: "length must be greater then and equal to 3"
                }]
            }
        }

        if (register.password.length <= 8) {
            return {
                errors: [{
                    field: "password",
                    message: "length must be greater then and equal to 8"
                }]
            }
        }
        if (register.gender.length <= 3) {
            return {
                errors: [{
                    field: "gender",
                    message: "Please enter your gender"
                }]
            }
        }

        const hashedPassword = await argon2.hash(register.password)
        const user = em.create(User, { username: register.username, gender: register.gender as string, password: hashedPassword as string } as User);
        try{
        await em.persistAndFlush(user);
        } catch(error) {
            console.log(`message: ${error.code}`)
           if(error.code === "23505" ) { //! || error.detail.includes("already exists")) {
               return {
                   errors: [{
                       field: "username",
                       message: "username already taken",
                   }]
               }
           }
        }
        return { user };

    }

    @Mutation(() => UserResponse)
    async login(
        @Arg("login") login: LoginParams,
        @Ctx() { em, req }: MyContext
    ): Promise<UserResponse> {

        // const user = await em.findOne(User, { username: login.username });
        let user; 
        try{
            user = await em.findOne(User, { username: login.username });
        } catch (e) {
            console.log(e)
        }

        if (!user) {
            return {
                errors: [{
                    field: 'username',
                    message: "that username doesn't exist"
                }]
            }
        }

        const valid = await argon2.verify(user.password, login.password);

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
        @Ctx() {req, res}: MyContext
    ) {
        return new Promise((resolver) => req.session.destroy((err) => {
            res.clearCookie(COOKIE_NAME)
            if(err) {
                resolver(false)
                return
            }
            resolver(true)
        }))
    }
}


// s%3AyROoN2lim3K5kKsTEG3nNLCRMi47-msp.I9O1aWUdXsRS1LxHUatPYhGchy7pRcTA0k5i9Rl30jU