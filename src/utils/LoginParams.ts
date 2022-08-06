import { InputType, Field } from "type-graphql";

// import { session, SessionData } from "express-session";
@InputType()
class LoginParams {
    @Field()
    username: string;

    @Field()
    password: string;

    @Field()
    email: string;
}
