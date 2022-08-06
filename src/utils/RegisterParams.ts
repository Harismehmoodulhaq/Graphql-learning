import { InputType, Field } from "type-graphql";

@InputType()
export class RegisterParams {
    @Field()
    gender: string;

    @Field()
    username: string;

    @Field()
    password: string;

    @Field()
    email: string;
}
