import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Layers3,
  Sparkles,
  Crown,
  DoorOpen,
  Gamepad2,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useLiveGames } from "@/hooks/use-live-games";
import { UpdateBanner } from "@/components/update-banner";
import {
  HOSTING_PACKAGES,
  HOURS_PER_BLOCK,
  packagePrice,
} from "@/hosting-packages";
import "./public-site.css";

function PublicLayout({ children }: { children: (ar: boolean) => ReactNode }) {
  const [ar, setAr] = useState(
    () => localStorage.getItem("dordor-language") === "ar",
  );
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <div className="dd-public" dir={ar ? "rtl" : "ltr"} lang={ar ? "ar" : "en"}>
      <header className="dd-header dd-container">
        <Link
          href="/"
          className="dd-brand"
          aria-label={t("Dordor Games home", "دور دور الرئيسية")}
        >
          <img src="/favicon.png" alt="دور دور" />
        </Link>
        <nav
          id="dd-mobile-nav"
          className={open ? "dd-nav is-open" : "dd-nav"}
          aria-label={t("Main navigation", "القائمة الرئيسية")}
          onClick={() => setOpen(false)}
        >
          <a href="/#games">{t("Games", "الألعاب")}</a>
          <a href="/#how-it-works">{t("How It Works", "كيف تلعب")}</a>
          <Link href="/pricing">{t("Pricing", "الأسعار")}</Link>
          <Link href="/join">{t("Join Game", "انضم للعبة")}</Link>
          <Link href="/host">{t("Login", "تسجيل الدخول")}</Link>
          <Link className="dd-button" href="/host">
            {t("Host a Game", "استضف لعبة")}
          </Link>
        </nav>
        <button
          className="dd-language"
          onClick={() => {
            localStorage.setItem("dordor-language", ar ? "en" : "ar");
            setAr(!ar);
          }}
          aria-label={t("Switch to Arabic", "التبديل إلى الإنجليزية")}
        >
          {ar ? "EN" : "عربي"}
        </button>
        <button
          className="dd-menu"
          aria-expanded={open}
          aria-controls="dd-mobile-nav"
          aria-label={t("Toggle navigation", "فتح وإغلاق القائمة")}
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </header>
      <main>{children(ar)}</main>
      <footer className="dd-footer dd-container">
        <Link href="/" className="dd-brand">
          <img src="/favicon.png" alt="دور دور" />
        </Link>
        <p>
          {t(
            "Good company. Great game nights.",
            "صحبة حلوة. وليالي ألعاب أحلى.",
          )}
        </p>
        <Link href="/pricing">{t("Hosting packages", "باقات الاستضافة")}</Link>
        <Link href="/purchase#purchase-information">
          {t("Purchase information", "معلومات الشراء")}
        </Link>
      </footer>
    </div>
  );
}

function BlockVisual({
  paid,
  bonus,
  ar,
}: {
  paid: number;
  bonus: number;
  ar: boolean;
}) {
  return (
    <div className="dd-block-visual">
      <div className="dd-block-tokens" aria-hidden="true">
        {Array.from({ length: paid + bonus }, (_, i) => (
          <span key={i} className={i >= paid ? "bonus" : ""}>
            <Layers3 size={16} />
          </span>
        ))}
      </div>
      <span>
        {ar
          ? `${paid} مدفوع${bonus ? ` + ${bonus} مجاني` : ""}`
          : `${paid} paid${bonus ? ` + ${bonus} free` : ""}`}
      </span>
    </div>
  );
}

function Packages({ ar }: { ar: boolean }) {
  const reduced = useReducedMotion();
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  return (
    <div className="dd-packages">
      {HOSTING_PACKAGES.map((p, index) => (
        <motion.article
          key={p.id}
          className={`dd-package ${p.id === "game-night" ? "recommended" : ""} ${p.id === "ultimate" ? "ultimate" : ""}`}
          initial={reduced ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.45, delay: index * 0.08 }}
          whileHover={reduced ? undefined : { y: -6 }}
        >
          <div className="dd-package-top">
            <span className="dd-package-icon">
              {p.id === "ultimate" ? (
                <Crown />
              ) : p.id === "game-night" ? (
                <Sparkles />
              ) : (
                <Gamepad2 />
              )}
            </span>
            <span>{ar ? "باقة استضافة" : "HOSTING PASS"}</span>
          </div>
          <div className="dd-package-label">
            {p.id === "game-night"
              ? t("THE GAME NIGHT FAVORITE", "الخيار الموصى به")
              : p.id === "ultimate"
                ? t("KEEP THE PARTY GOING", "خلّ الحفلة تستمر")
                : t("START SOMETHING FUN", "ابدأ المرح")}
          </div>
          <h2>{ar ? p.nameAr : p.name}</h2>
          <p className="dd-price" dir="auto">
            {packagePrice(p.price, ar)}
          </p>
          <p className="dd-hours">
            {(p.paid + p.bonus) * HOURS_PER_BLOCK}{" "}
            <span>{t("hours of hosting", "ساعات استضافة")}</span>
          </p>
          <BlockVisual paid={p.paid} bonus={p.bonus} ar={ar} />
          {p.bonus > 0 && (
            <strong className="dd-bonus">
              {p.bonus}{" "}
              {t(p.bonus === 1 ? "FREE BLOCK" : "FREE BLOCKS", "بلوك مجاني")}
            </strong>
          )}
          <ul>
            <li>
              <Check />
              {t(
                `${p.paid} paid hosting ${p.paid === 1 ? "block" : "blocks"}`,
                `${p.paid} بلوك استضافة مدفوع`,
              )}
            </li>
            {p.bonus > 0 && (
              <li>
                <Check />
                {t(
                  `${p.bonus} bonus ${p.bonus === 1 ? "block" : "blocks"} · ${p.paid + p.bonus} total blocks`,
                  `${p.bonus} بلوك مجاني · ${p.paid + p.bonus} بلوك إجمالي`,
                )}
              </li>
            )}
            <li>
              <Check />
              {t(
                "Access to available games while hosting",
                "الوصول للألعاب المتاحة أثناء الاستضافة",
              )}
            </li>
            <li>
              <Check />
              {t("Invite friends for free", "ادعُ أصدقاءك مجاناً")}
            </li>
          </ul>
          {p.provisional && (
            <p className="dd-notice">
              {t(
                "Provisional price. Confirmation required before this offer goes live.",
                "سعر مبدئي. يلزم تأكيده قبل نشر العرض للبيع.",
              )}
            </p>
          )}
          <Link className="dd-button" href={`/purchase?package=${p.id}`}>
            {t(
              `CHOOSE ${p.id === "ultimate" ? "ULTIMATE" : p.name.toUpperCase()}`,
              `اختر ${p.nameAr}`,
            )}
            <ArrowUpRight size={18} />
          </Link>
        </motion.article>
      ))}
    </div>
  );
}

function HostingBlocks({ ar }: { ar: boolean }) {
  return (
    <section className="dd-blocks dd-container">
      <div>
        <p className="dd-eyebrow">
          {ar ? "وقتك، لعبتك" : "YOUR TIME. YOUR GAME."}
        </p>
        <h2>{ar ? "ما هو بلوك الاستضافة؟" : "WHAT IS A HOSTING BLOCK?"}</h2>
        <p>
          {ar
            ? "بلوك استضافة واحد يمنحك ساعتين لاستضافة الألعاب على دور دور."
            : "One hosting block gives you two hours of access to host games on Dordor."}
        </p>
        <p>
          {ar
            ? "المضيف فقط يحتاج لشراء وقت الاستضافة. المدعوون ينضمون دون دفع."
            : "Only the host needs to purchase hosting time. Invited participants can join without paying."}
        </p>
      </div>
      <dl>
        {[1, 4, 8].map((n) => (
          <div key={n}>
            <dt>
              {n} {ar ? "بلوك" : n === 1 ? "BLOCK" : "BLOCKS"}
            </dt>
            <dd>
              {n * 2} {ar ? "ساعات" : "HOURS"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function HowItWorks({ ar }: { ar: boolean }) {
  const reduced = useReducedMotion();
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const steps = [
    {
      icon: Gamepad2,
      title: t("Pick your game", "اختر لعبتك"),
      detail: t(
        "Find your group's next favorite.",
        "اختاروا اللعبة اللي تناسب جمعتكم.",
      ),
    },
    {
      icon: Clock3,
      title: t("Make time for fun", "خصص وقت للوناسة"),
      detail: t("Choose your hosting package.", "اختر باقة وقت الاستضافة."),
    },
    {
      icon: DoorOpen,
      title: t("Open your room", "افتح غرفتك"),
      detail: t(
        "Create a room to bring everyone in.",
        "أنشئ غرفة تجمع فيها الكل.",
      ),
    },
    {
      icon: Users,
      title: t("Bring your people", "اجمع ربعك"),
      detail: t(
        "Invite your friends. They join free.",
        "ادعُ أصدقاءك. ينضمون مجاناً.",
      ),
    },
    {
      icon: Sparkles,
      title: t("Let the night begin", "خلّ الليلة تبدأ"),
      detail: t(
        "Play together. Make it a memory.",
        "العبوا معاً واصنعوا ذكرى حلوة.",
      ),
    },
  ];
  return (
    <section id="how-it-works" className="dd-how">
      <div className="dd-section dd-container">
        <div className="dd-how-heading">
          <div>
            <p className="dd-eyebrow">
              {t("LESS SETUP. MORE PLAY.", "تجهيز أقل. لعب أكثر.")}
            </p>
            <h2>
              {t("FIVE STEPS. ONE GREAT NIGHT.", "خمس خطوات. وليلة ما تنسى.")}
            </h2>
          </div>
          <span className="dd-how-kicker">
            <Gamepad2 size={18} />
            {t("YOU HOST. EVERYONE PLAYS.", "أنت تستضيف. والكل يلعب.")}
          </span>
        </div>
        <ol>
          {steps.map(({ icon: Icon, title, detail }, i) => (
            <motion.li
              key={title}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35, delay: i * 0.09 }}
            >
              <div className="dd-step-node">
                <Icon size={24} aria-hidden="true" />
              </div>
              <div className="dd-step-copy">
                <span className="dd-step-number">0{i + 1}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </motion.li>
          ))}
        </ol>
        <div className="dd-how-footer">
          <p>
            <Users size={20} aria-hidden="true" />
            {t(
              "One host pays. The whole group plays.",
              "مضيف واحد يدفع. والقروب كله يلعب.",
            )}
          </p>
          <Link className="dd-text-link" href="/pricing">
            {t("Find your hosting pass", "اختر باقة استضافتك")}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

export function PublicHome() {
  const { games, updateAvailable } = useLiveGames();
  const ids = ["spy", "tfadhloon", "forehead", "guessthecharacter", "charades"];
  return (
    <PublicLayout>
      {(ar) => {
        const t = (en: string, arabic: string) => (ar ? arabic : en);
        const arabicNames: Record<string, string> = {
          spy: "الجاسوس",
          tfadhloon: "تفضلون",
          forehead: "خمن كلمتك",
          guessthecharacter: "خمن الشخصية",
          charades: "تمثيل",
        };
        return (
          <>
            <section className="dd-hero">
              <div className="dd-container dd-hero-inner">
                <div className="dd-hero-copy">
                  <p className="dd-eyebrow">
                    {t(
                      "DORDOR GAMES / MADE FOR YOUR PEOPLE",
                      "دور دور / الوناسة مع ربعك",
                    )}
                  </p>
                  <h1>
                    {t(
                      "GOOD FRIENDS. GREAT GAME NIGHTS.",
                      "ربعك. ألعابك. ليلة ما تنسى.",
                    )}
                  </h1>
                  <p>
                    {t(
                      "Five party games. One host. Everyone in on the fun.",
                      "خمس ألعاب جماعية. مضيف واحد. والوناسة للجميع.",
                    )}
                  </p>
                  <div className="dd-actions">
                    <Link className="dd-button" href="/host">
                      <Gamepad2 size={20} />
                      {t("HOST A GAME", "استضف لعبة")}
                    </Link>
                    <Link className="dd-button dd-secondary" href="/join">
                      <Users size={20} />
                      {t("JOIN A GAME", "انضم للعبة")}
                    </Link>
                  </div>
                  <small>
                    {t(
                      "Only hosts pay. Everyone else joins free.",
                      "المضيف فقط يدفع. الجميع ينضم مجاناً.",
                    )}
                  </small>
                </div>
                <div className="dd-hero-art">
                  <img
                    className="dd-hero-logo"
                    src="/favicon.png"
                    alt="دور دور"
                  />
                  <span className="dd-hero-caption">
                    <Sparkles size={16} />
                    {t(
                      "THE GROUP CHAT, BROUGHT TO LIFE.",
                      "حوّل سوالف القروب إلى ليلة لعب.",
                    )}
                  </span>
                </div>
              </div>
            </section>
            <section
              className="dd-benefits dd-container"
              aria-label={t("Benefits", "المميزات")}
            >
              {[
                [Gamepad2, t("Multiplayer Party Games", "ألعاب جماعية")],
                [Clock3, t("Flexible Hosting Time", "وقت استضافة مرن")],
                [Users, t("Friends Join Free", "الأصدقاء ينضمون مجاناً")],
                [ShieldCheck, t("Instant Game Access", "وصول فوري للألعاب")],
              ].map(([Icon, label], i) => {
                const BenefitIcon = Icon as typeof Gamepad2;
                return (
                  <div key={i}>
                    <BenefitIcon size={24} />
                    <span>{label as string}</span>
                  </div>
                );
              })}
            </section>
            <section id="games" className="dd-section dd-container">
              <p className="dd-eyebrow">
                {t("FIVE WAYS TO MAKE A NIGHT", "خمس طرق للوناسة")}
              </p>
              <h2>{t("EXPLORE OUR GAMES", "اكتشف ألعابنا")}</h2>
              <div className="dd-games">
                {ids.map((id) => {
                  const g = games.find((game) => game.id === id);
                  if (!g) return null;
                  return (
                    <article className="dd-game" key={id}>
                      <Link
                        href={g.route}
                        aria-label={t(
                          `Open ${g.title}`,
                          `افتح ${arabicNames[id]}`,
                        )}
                      >
                        <img
                          src={g.imageUrl}
                          alt={ar ? arabicNames[id] : g.title}
                          loading="lazy"
                        />
                      </Link>
                      <h3>{ar ? arabicNames[id] : g.title}</h3>
                      <div>
                        <Link href={g.route}>
                          {t("Play", "العب")}
                          <ArrowUpRight size={16} />
                        </Link>
                        <Link href="/pricing">{t("Host", "استضف")}</Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
            <HowItWorks ar={ar} />
            <section className="dd-section dd-container">
              <p className="dd-eyebrow">
                {t("MORE NIGHTS. MORE MEMORIES.", "ليالٍ أكثر. ذكريات أكثر.")}
              </p>
              <h2>{t("HOST MORE. PAY LESS.", "استضف أكثر. وادفع أقل.")}</h2>
              <p>
                {t(
                  "Purchase blocks of hosting time and enjoy your favorite games with friends.",
                  "اشترِ بلوكات وقت الاستضافة واستمتع بألعابك المفضلة مع أصدقائك.",
                )}
              </p>
              <Packages ar={ar} />
              <Link className="dd-text-link" href="/pricing">
                {t("VIEW HOSTING PACKAGES", "عرض باقات الاستضافة")}
                <ArrowUpRight size={18} />
              </Link>
            </section>
            <UpdateBanner visible={updateAvailable} />
          </>
        );
      }}
    </PublicLayout>
  );
}

export function Pricing() {
  return (
    <PublicLayout>
      {(ar) => (
        <>
          <section className="dd-section dd-container">
            <div className="dd-page-intro">
              <p className="dd-eyebrow">
                {ar ? "باقات استضافة دور دور" : "DORDOR HOSTING PASSES"}
              </p>
              <h1>
                {ar
                  ? "وقت أكثر. ألعاب أكثر. مرح أكثر."
                  : "MORE TIME. MORE GAMES. MORE FUN."}
              </h1>
              <p>
                {ar
                  ? "اختر باقة الاستضافة واستمتع بليالي ألعاب لا تُنسى مع أصدقائك."
                  : "Choose your hosting package and enjoy unforgettable game nights with your friends."}
              </p>
              <strong>
                {ar
                  ? "المضيف فقط يدفع. الجميع ينضم مجاناً."
                  : "ONLY THE HOST PAYS. EVERYONE ELSE JOINS FREE."}
              </strong>
              <p>
                {ar
                  ? "نبيع وقت استضافة، وليس ألعاباً منفردة. البلوك الواحد يساوي ساعتين."
                  : "We sell hosting time, not individual games. One block equals two hours."}
              </p>
            </div>
            <Packages ar={ar} />
          </section>
          <HostingBlocks ar={ar} />
        </>
      )}
    </PublicLayout>
  );
}

export function Purchase() {
  const requested = new URLSearchParams(window.location.search).get("package");
  const selected = HOSTING_PACKAGES.find((p) => p.id === requested);
  return (
    <PublicLayout>
      {(ar) => {
        const t = (en: string, arabic: string) => (ar ? arabic : en);
        return (
          <section className="dd-section dd-container">
            <p className="dd-eyebrow">
              {t("YOUR NEXT GAME NIGHT", "ليلة ألعابك القادمة")}
            </p>
            <h1 className="dd-purchase-title">
              {t("YOUR HOSTING PASS", "باقة استضافتك")}
            </h1>
            {!selected ? (
              <div className="dd-empty">
                <p>
                  {t(
                    requested
                      ? "This package is unavailable. Please choose a hosting package."
                      : "Choose a hosting package to see your purchase summary.",
                    "اختر باقة استضافة لعرض ملخص الشراء.",
                  )}
                </p>
                <Link className="dd-button" href="/pricing">
                  {t("VIEW PACKAGES", "عرض الباقات")}
                </Link>
              </div>
            ) : (
              <div className="dd-purchase-grid">
                <div className="dd-purchase-details">
                  <div className="dd-pass-label">
                    <Layers3 size={20} />
                    {t("YOUR ALL-IN HOSTING PASS", "باقتك للوناسة")}
                  </div>
                  <p className="dd-eyebrow">
                    {t("MERCHANT: DORDOR GAMES", "التاجر: دور دور للألعاب")}
                  </p>
                  <h2>
                    {ar
                      ? selected.nameAr
                      : `DORDOR ${selected.name.toUpperCase()} PASS`}
                  </h2>
                  <p className="dd-hours">
                    {(selected.paid + selected.bonus) * HOURS_PER_BLOCK}{" "}
                    <span>
                      {t("hours of hosting time", "ساعات من وقت الاستضافة")}
                    </span>
                  </p>
                  <BlockVisual
                    paid={selected.paid}
                    bonus={selected.bonus}
                    ar={ar}
                  />
                  <dl className="dd-facts dd-pass-facts">
                    {[
                      [
                        t("Paid hosting blocks", "بلوكات الاستضافة المدفوعة"),
                        selected.paid,
                      ],
                      [
                        t("Bonus hosting blocks", "بلوكات الاستضافة المجانية"),
                        selected.bonus,
                      ],
                      [
                        t("Total hosting blocks", "إجمالي بلوكات الاستضافة"),
                        selected.paid + selected.bonus,
                      ],
                      [
                        t("Total hosting hours", "إجمالي ساعات الاستضافة"),
                        (selected.paid + selected.bonus) * HOURS_PER_BLOCK,
                      ],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    {t(
                      "One-time purchase of hosting time. Access to available games while hosting.",
                      "شراء وقت استضافة لمرة واحدة. الوصول للألعاب المتاحة أثناء الاستضافة.",
                    )}
                  </p>
                  <p className="dd-host-note">
                    <Users />
                    {t(
                      "Participants join games for free. Only the host purchases hosting time.",
                      "المشاركون ينضمون للألعاب مجاناً. المضيف فقط يشتري وقت الاستضافة.",
                    )}
                  </p>
                  <Link className="dd-text-link" href="/pricing">
                    {t("Change package", "تغيير الباقة")}
                  </Link>
                </div>
                <aside className="dd-order">
                  <ShieldCheck size={28} />
                  <h2>{t("Order summary", "ملخص الطلب")}</h2>
                  <p className="dd-order-caption">
                    {t(
                      "One purchase. A whole lot of good times.",
                      "شراء واحد. ووقت مليان وناسة.",
                    )}
                  </p>
                  <dl className="dd-facts">
                    <div>
                      <dt>{ar ? selected.nameAr : selected.name}</dt>
                      <dd dir="auto">{packagePrice(selected.price, ar)}</dd>
                    </div>
                    <div className="dd-total">
                      <dt>{t("Total payable", "إجمالي المبلغ")}</dt>
                      <dd dir="auto">{packagePrice(selected.price, ar)}</dd>
                    </div>
                  </dl>
                  {selected.provisional && (
                    <p className="dd-notice">
                      {t(
                        "Provisional price. Confirmation required before publication.",
                        "سعر مبدئي. يلزم تأكيده قبل النشر.",
                      )}
                    </p>
                  )}
                  <button className="dd-button" disabled>
                    <ShieldCheck size={18} />
                    {t("PROCEED TO SECURE PAYMENT", "المتابعة للدفع الآمن")}
                  </button>
                  <p className="dd-payment-state" role="status">
                    {t(
                      "Secure payment will be available after payment gateway activation.",
                      "سيتوفر الدفع الآمن بعد تفعيل بوابة الدفع.",
                    )}
                  </p>
                </aside>
              </div>
            )}
            <section
              id="purchase-information"
              className="dd-purchase-information"
            >
              <h2>{t("Purchase information", "معلومات الشراء")}</h2>
              <p>
                {t(
                  "Required before publication: approved merchant details and policies must be supplied.",
                  "مطلوب قبل النشر: توفير بيانات التاجر والسياسات المعتمدة.",
                )}
              </p>
              {[
                ["Terms and Conditions", "الشروط والأحكام"],
                ["Refund and Cancellation Policy", "سياسة الاسترداد والإلغاء"],
                ["Privacy Policy", "سياسة الخصوصية"],
                ["Customer Support", "دعم العملاء"],
                ["Merchant contact details", "بيانات التواصل مع التاجر"],
              ].map(([en, arabic]) => (
                <details key={en}>
                  <summary>{t(en, arabic)}</summary>
                  <p>
                    {t(
                      "Required before publication. Approved information has not yet been supplied.",
                      "مطلوب قبل النشر. لم يتم توفير المعلومات المعتمدة بعد.",
                    )}
                  </p>
                </details>
              ))}
            </section>
          </section>
        );
      }}
    </PublicLayout>
  );
}
