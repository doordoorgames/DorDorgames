import { useEffect, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Clock3,
  CreditCard,
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
import { getGameById } from "@/games-config";
import { UpdateBanner } from "@/components/update-banner";
import { getGetAuthMeQueryKey, useGetAuthMe } from "@workspace/api-client-react";
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
  const account = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey(), retry: false, refetchOnWindowFocus: false },
  });
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
          <Link href="/account" className="dd-account-link">
            <span aria-hidden="true" className="dd-account-avatar">
              {account.data?.fullName?.trim().charAt(0).toUpperCase() || "?"}
            </span>
            <span>{account.data?.fullName || t("Log in", "تسجيل الدخول")}</span>
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
        <Link href="/checkout#purchase-information">
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

function Packages({ ar, game }: { ar: boolean; game?: string | null }) {
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
              ? t("RECOMMENDED", "موصى به")
              : p.id === "ultimate"
                ? t("BEST VALUE", "أفضل قيمة")
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
          <Link
            className="dd-button"
            href={`/checkout?package=${p.id}${game ? `&game=${encodeURIComponent(game)}` : ""}`}
          >
            {t(
              p.id === "starter"
                ? "GET STARTED"
                : p.id === "game-night"
                  ? "GET GAME NIGHT"
                  : "GET ULTIMATE",
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

function Faq({ ar }: { ar: boolean }) {
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const provisional = t(
    "This rule is awaiting business approval and will be confirmed before payments go live.",
    "هذه القاعدة بانتظار اعتماد الإدارة وسيتم تأكيدها قبل تفعيل الدفع.",
  );
  const items = [
    [
      t("What is a hosting block?", "ما هو بلوك الاستضافة؟"),
      t(
        "One block gives the host two hours of access to available Dordor games.",
        "البلوك الواحد يمنح المضيف ساعتين للوصول إلى ألعاب دور دور المتاحة.",
      ),
    ],
    [
      t("Do participants need to pay?", "هل يحتاج المشاركون للدفع؟"),
      t(
        "No. Only the host purchases hosting time. Participants join the room for free.",
        "لا. المضيف فقط يشتري وقت الاستضافة، والمشاركون ينضمون إلى الغرفة مجاناً.",
      ),
    ],
    [
      t("Can I play different games?", "هل يمكنني لعب ألعاب مختلفة؟"),
      t(
        "A hosting pass provides access to available games while your hosting session is active.",
        "تمنحك باقة الاستضافة وصولاً إلى الألعاب المتاحة أثناء جلسة الاستضافة النشطة.",
      ),
    ],
    [t("When does my hosting time start?", "متى يبدأ وقت الاستضافة؟"), provisional],
    [t("Can I use blocks on different days?", "هل يمكن استخدام البلوكات في أيام مختلفة؟"), provisional],
    [t("What happens when my time expires?", "ماذا يحدث عند انتهاء الوقت؟"), provisional],
    [t("Do unused blocks expire?", "هل تنتهي صلاحية البلوكات غير المستخدمة؟"), provisional],
    [
      t("Can I purchase more blocks?", "هل يمكنني شراء بلوكات إضافية؟"),
      t(
        "Yes. You can return to the pricing page to purchase another hosting pass.",
        "نعم. يمكنك العودة إلى صفحة الأسعار لشراء باقة استضافة إضافية.",
      ),
    ],
  ];

  return (
    <section className="dd-section dd-container dd-faq">
      <p className="dd-eyebrow">{t("GOOD TO KNOW", "معلومات مهمة")}</p>
      <h2>{t("FREQUENTLY ASKED QUESTIONS", "الأسئلة الشائعة")}</h2>
      <div className="dd-faq-grid">
        {items.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function PublicHome() {
  const { games, updateAvailable } = useLiveGames();
  const account = useGetAuthMe({
    query: { queryKey: getGetAuthMeQueryKey(), retry: false, refetchOnWindowFocus: false },
  });
  const ids = ["spy", "tfadhloon", "forehead", "guessthecharacter", "charades"];
  const gameHref = (externalUrl: string) =>
    account.data
      ? externalUrl
      : `/account?returnTo=${encodeURIComponent(externalUrl)}`;
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
                      "THE GAME NIGHT STARTS HERE.",
                      "ليلة الألعاب تبدأ هنا.",
                    )}
                  </h1>
                  <p>
                    {t(
                      "Play together. Laugh together. Make memories.",
                      "العبوا معاً. اضحكوا معاً. واصنعوا ذكريات.",
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
                      "Create a host account and get 30 minutes free. Your time starts after OTP verification.",
                      "أنشئ حساب مضيف واحصل على 30 دقيقة مجاناً. يبدأ الوقت بعد تأكيد رمز التحقق.",
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
                [
                  Gamepad2,
                  t("Multiplayer Party Games", "ألعاب جماعية"),
                  t(
                    "Made for groups, gatherings, and game nights.",
                    "مصممة للقروبات والجمعات وليالي اللعب.",
                  ),
                ],
                [
                  Clock3,
                  t("Flexible Hosting Time", "وقت استضافة مرن"),
                  t(
                    "Use your hosting blocks when your group is ready.",
                    "استخدم بلوكات الاستضافة عندما تكون جمعتكم جاهزة.",
                  ),
                ],
                [
                  Users,
                  t("Friends Join Free", "الأصدقاء ينضمون مجاناً"),
                  t(
                    "Only the host pays. Everyone else joins free.",
                    "المضيف فقط يدفع، والبقية ينضمون مجاناً.",
                  ),
                ],
                [
                  ShieldCheck,
                  t("Instant Game Access", "وصول فوري للألعاب"),
                  t(
                    "Choose a game, open a room, and start the fun.",
                    "اختر لعبة وافتح غرفة وابدأ الوناسة.",
                  ),
                ],
              ].map(([Icon, label, detail], i) => {
                const BenefitIcon = Icon as typeof Gamepad2;
                return (
                  <div key={i}>
                    <BenefitIcon size={24} />
                    <strong>{label as string}</strong>
                    <span>{detail as string}</span>
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
                      <a
                        href={gameHref(g.externalUrl)}
                        aria-label={t(
                          `Play ${g.title}`,
                          `العب ${arabicNames[id]}`,
                        )}
                      >
                        <img
                          src={g.imageUrl}
                          alt={ar ? arabicNames[id] : g.title}
                          loading="lazy"
                        />
                      </a>
                      <h3>{ar ? arabicNames[id] : g.title}</h3>
                      <p>{ar ? g.descriptionAr : g.description}</p>
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
  const game = new URLSearchParams(window.location.search).get("game");
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
            <Packages ar={ar} game={game} />
          </section>
          <HostingBlocks ar={ar} />
          <Faq ar={ar} />
        </>
      )}
    </PublicLayout>
  );
}

export function Purchase() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("package");
  const selectedGame = params.get("game");
  const game = selectedGame ? getGameById(selectedGame) : undefined;
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
              {t("SECURE YOUR GAME NIGHT", "احجز ليلة ألعابك")}
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
                  {game && (
                    <p className="dd-selected-game">
                      <Gamepad2 size={18} />
                      {t("Selected game", "اللعبة المختارة")}: {ar ? game.titleAr : game.title}
                    </p>
                  )}
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
                  <div
                    className="dd-customer-form"
                    aria-labelledby="customer-details-title"
                  >
                    <h2 id="customer-details-title">
                      {t("Customer details", "بيانات العميل")}
                    </h2>
                    <div className="dd-form-grid">
                      <label>
                        {t("Full name", "الاسم الكامل")}
                        <input type="text" autoComplete="name" />
                      </label>
                      <label>
                        {t("Email address", "البريد الإلكتروني")}
                        <input
                          type="email"
                          autoComplete="email"
                          inputMode="email"
                        />
                      </label>
                      <label>
                        {t("Mobile number", "رقم الهاتف")}
                        <input
                          type="tel"
                          autoComplete="tel"
                          inputMode="tel"
                        />
                      </label>
                    </div>
                    <p>
                      {t(
                        "Payment will be completed securely on MyFatoorah. Dordor Games does not collect or store card details.",
                        "سيتم الدفع بأمان عبر ماي فاتورة. دور دور لا تجمع أو تخزن بيانات البطاقة.",
                      )}
                    </p>
                  </div>
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
                  <div className="dd-order-meta">
                    <span>{t("One-time payment", "دفعة واحدة")}</span>
                    <span>
                      {t(
                        "Additional fees: none shown",
                        "رسوم إضافية: لا يوجد مبلغ معروض",
                      )}
                    </span>
                  </div>
                  {selected.provisional && (
                    <p className="dd-notice">
                      {t(
                        "Provisional price. Confirmation required before publication.",
                        "سعر مبدئي. يلزم تأكيده قبل النشر.",
                      )}
                    </p>
                  )}
                  <button className="dd-button" disabled>
                    <CreditCard size={18} />
                    {t("PAY SECURELY", "ادفع بأمان")}
                  </button>
                  <p className="dd-payment-state" role="status">
                    {t(
                      "Secure payment will be available after payment gateway activation.",
                      "سيتوفر الدفع الآمن بعد تفعيل بوابة الدفع.",
                    )}
                  </p>
                  <nav
                    className="dd-policy-links"
                    aria-label={t("Purchase policies", "سياسات الشراء")}
                  >
                    <a href="#terms">{t("Terms", "الشروط")}</a>
                    <a href="#privacy">{t("Privacy", "الخصوصية")}</a>
                    <a href="#refunds">{t("Refunds", "الاسترداد")}</a>
                    <a href="#support">{t("Support", "الدعم")}</a>
                  </nav>
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
                ["terms", "Terms and Conditions", "الشروط والأحكام"],
                [
                  "refunds",
                  "Refund and Cancellation Policy",
                  "سياسة الاسترداد والإلغاء",
                ],
                ["privacy", "Privacy Policy", "سياسة الخصوصية"],
                ["support", "Customer Support", "دعم العملاء"],
                ["merchant", "Merchant contact details", "بيانات التواصل مع التاجر"],
              ].map(([id, en, arabic]) => (
                <details id={id} key={id}>
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
