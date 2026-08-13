import { z } from "zod"

export const loginSchema = z.object({
    email: z.email({
        error: "Please enter a valid email address",
    }),

    password: z.string().min(1, {
        error: "Password is required",
    })
});

export const registerSchema = z.object({
    email: z.email({
        error: "Please enter a valid email address",
    }),

    password: z.string().min(8, {
        error: "Password must be at least 8 characters",
    }),
    confirmPassword: z.string().min(1, {
        error: "Please confirm your password",
    }),
})
.refine((data) => data.password === data.confirmPassword, {
    error: "Passwords do not match",
    path: ["confirmPassword"],
})

export type LoginFormValues = z.infer<typeof loginSchema>
export type RegisterFormValues = z.infer<typeof registerSchema>;