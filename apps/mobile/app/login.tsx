import { useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Button, Field, H2, Body, Notice } from "../src/ui";
import { useAuth } from "../src/auth";
import { space } from "../src/theme";

export default function Login() {
  const r = useRouter(); const { signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email) && password.length >= 8;
  async function run(fn: () => Promise<string | null>, ok?: string) { setBusy(true); const e = await fn(); setBusy(false); setMsg(e ?? ok ?? null); return !e; }
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }}>
      <H2>Accedi o crea un account</H2>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password (almeno 8 caratteri)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Button label="Accedi" disabled={!valid || busy} onPress={async () => { if (await run(() => signIn(email, password))) r.replace("/"); }} />
      <Button kind="ghost" label="Crea account" disabled={!valid || busy} onPress={async () => { if (await run(() => signUp(email, password), "Controlla la tua email per confermare l'account, poi accedi.")) { /* resta qui */ } }} />
      <Button kind="ghost" label="Password dimenticata" disabled={!/^\S+@\S+\.\S+$/.test(email) || busy} onPress={() => run(() => resetPassword(email), "Se l'indirizzo è registrato, riceverai un'email per il recupero.")} />
      {msg && <Notice>{msg}</Notice>}
      <Body soft>Useremo la tua email solo per l'accesso e il recupero dell'account.</Body>
    </ScrollView>
  );
}
