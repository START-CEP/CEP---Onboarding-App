import Image from "next/image";

/** Marco de las páginas de acceso (login, recuperar, crear contraseña) con la marca Creciendo en pareja. */
export function AuthShell({ eyebrow, title, text, children }: { eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="app">
      <div className="login">
        <div className="lbox">
          <div className="art">
            <Image className="logo" src="/brand/logo.png" alt="Creciendo en pareja" width={720} height={275} priority />
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1 className="hi">{title}</h1>
              <p>{text}</p>
            </div>
            <svg className="route" viewBox="0 0 300 90" style={{ width: "100%", maxWidth: 340 }} aria-hidden="true">
              <path d="M10 70 C70 70 70 20 130 20 S190 70 250 50 S290 20 295 20" fill="none" stroke="#5EBAD6"
                strokeWidth="4" strokeDasharray="2 9" strokeLinecap="round" />
              <circle cx="10" cy="70" r="7" fill="#5EBAD6" />
              <circle cx="130" cy="20" r="7" fill="#F6A000" />
              <circle cx="250" cy="50" r="7" fill="#FFFDF8" stroke="#1E1E1E" strokeWidth="3" />
            </svg>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
