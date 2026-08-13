import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CarFront } from "lucide-react";
import axios from "axios"

import { Button } from "@/shared/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { toast } from "@/shared/components/ui/toast";

import { ROUTES } from "@/app/router/routes";

import { authApi } from "../api/authApi";
import { useAuth } from "../hooks/useAuth";
import {
    registerSchema,
    type RegisterFormValues,
} from "../validation/authSchemas";

export default function RegisterPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const { setAuth } = useAuth();

    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            email: "",
            password: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (data: RegisterFormValues) => {
        try {
            setIsLoading(true);

            const response = await authApi.register({
                email: data.email,
                password: data.password,
            });

            setAuth(
                response.user,
                response.access_token
            );

            toast.add({
                title: "Account created",
                description:
                    "Welcome to Smart Drive!",
                type: "success",
            });

            const from =
                location.state?.from?.pathname ??
                ROUTES.DASHBOARD;

            navigate(from, {
                replace: true,
            });
        } catch (error) {
            console.error("Registration failed:", error);

            let message = "Unable to create your account. Please try again.";

            if (axios.isAxiosError(error)) {
                message =
                    error.response?.data?.detail ??
                    message;
            }

            toast.add({
                title: "Registration failed",
                description: message,
                type: "error",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-4">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                        <CarFront className="size-5" />
                    </div>

                    <div className="space-y-1">
                        <h1 className="font-heading text-2xl font-semibold tracking-tight">
                            Create your account
                        </h1>

                        <p className="text-sm text-muted-foreground">
                            Start managing your vehicle with Smart Drive.
                        </p>
                    </div>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="space-y-5"
                    >
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">
                                Email
                            </Label>

                            <Input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                disabled={isLoading}
                                {...register("email")}
                            />

                            {errors.email && (
                                <p className="text-sm text-destructive">
                                    {errors.email.message}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                Password
                            </Label>

                            <Input
                                id="password"
                                type="password"
                                placeholder="At least 8 characters"
                                autoComplete="new-password"
                                disabled={isLoading}
                                {...register("password")}
                            />

                            {errors.password && (
                                <p className="text-sm text-destructive">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        {/* Confirm password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">
                                Confirm password
                            </Label>

                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="Enter your password again"
                                autoComplete="new-password"
                                disabled={isLoading}
                                {...register("confirmPassword")}
                            />

                            {errors.confirmPassword && (
                                <p className="text-sm text-destructive">
                                    {
                                        errors
                                            .confirmPassword
                                            .message
                                    }
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading && (
                                <Loader2 className="size-4 animate-spin" />
                            )}

                            {isLoading
                                ? "Creating account..."
                                : "Create account"}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link
                                to={ROUTES.LOGIN}
                                className="font-medium text-primary hover:underline"
                            >
                                Sign in
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}