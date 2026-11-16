/*--------------------------------------------*
 * Local Relative
 *--------------------------------------------*/
import { AcceptTerms } from "./components/AcceptTerms";
import { RegistrationProvider } from "./context/RegistrationContext";
export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <RegistrationProvider acceptTerms={<AcceptTerms />}>{children}</RegistrationProvider>;
}
