export default function SignupPage() {
  return (
    <section className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-md">
        <AuthForm mode="signup" />
      </div>
    </section>
  )
}

import { AuthForm } from "@/components/auth/auth-form"
