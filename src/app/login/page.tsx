import { AuthForm } from "@/components/auth/AuthForm";
import { login, signup } from "./action";

export default function LoginPage() {
  return <AuthForm login={login} signup={signup} />;
}