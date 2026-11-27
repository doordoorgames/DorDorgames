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
import {
  getGetAuthMeQueryKey,
  useGetAuthMe,
  useGetPaymentOrder,
  useProcessPayment,
} from "@workspace/api-client-react";
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
    query: {
      queryKey: getGetAuthMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
    },
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
            <span>
              {account.isLoading
                ? t("Checking…", "جارٍ التحقق…")
                : account.data?.fullName || t("Log in", "تسجيل الدخول")}
            </span>
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

function Packages({ ar, game, compact = false }: { ar: boolean; game?: string | null; compact?: boolean }) {
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
            <span>{ar ? "باقة لعب" : "GAME PASS"}</span>
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
            <span>{t("hours of gameplay", "ساعات لعب")}</span>
          </p>
          <BlockVisual paid={p.paid} bonus={p.bonus} ar={ar} />
          {p.bonus > 0 && (
            <strong className="dd-bonus">
              {p.bonus}{" "}
              {t(p.bonus === 1 ? "FREE BLOCK" : "FREE BLOCKS", "بلوك مجاني")}
            </strong>
          )}
          {!compact && <ul>
            <li>
              <Check />
              {t(
                `${p.paid} paid game pass ${p.paid === 1 ? "block" : "blocks"}`,
                `${p.paid} بلوك لعب مدفوع`,
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
          </ul>}
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
          <Link className="dd-button" href="/pricing">
            {t("Find Your Game Pass", "اختر باقة لعبك")}
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
    [
      t("When does my hosting time start?", "متى يبدأ وقت الاستضافة؟"),
      provisional,
    ],
    [
      t(
        "Can I use blocks on different days?",
        "هل يمكن استخدام البلوكات في أيام مختلفة؟",
      ),
      provisional,
    ],
    [
      t("What happens when my time expires?", "ماذا يحدث عند انتهاء الوقت؟"),
      provisional,
    ],
    [
      t("Do unused blocks expire?", "هل تنتهي صلاحية البلوكات غير المستخدمة؟"),
      provisional,
    ],
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
  const { games } = useLiveGames();
  const ids = ["spy", "tfadhloon", "forehead", "guessthecharacter", "charades"];
  const gameHref = (externalUrl: string) => externalUrl;
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
                    {t("THE GAME NIGHT STARTS HERE.", "ليلة الألعاب تبدأ هنا.")}
                  </h1>
                  <p>
                    {t(
                      "Play together. Laugh together. Make memories.",
                      "العبوا معاً. اضحكوا معاً. واصنعوا ذكريات.",
                    )}
                  </p>
                  <div className="dd-free-offer">
                    <span className="dd-free-offer-icon" aria-hidden="true">
                      <Sparkles size={22} />
                    </span>
                    <span>
                      <strong>
                        {t(
                          "ONE HOST PAYS. EVERYONE PLAYS FREE.",
                          "مضيف واحد يدفع. والجميع يلعب مجاناً.",
                        )}
                      </strong>
                      <small>
                        {t(
                          "Start a room, share the code, and have fun together.",
                          "افتح غرفة وشارك الرمز واستمتعوا معاً.",
                        )}
                      </small>
                    </span>
                  </div>
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
          <section className="dd-section dd-container dd-pricing">
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
            </div>
            <Packages ar={ar} game={game} compact />
              <div className="dd-pricing-note">
                <strong>{ar ? "المضيف فقط يدفع. أصدقاؤك ينضمون مجاناً." : "One host pays. Everyone plays."}</strong>
                <p>{ar ? "كل باقة تشمل الألعاب المتاحة أثناء الاستضافة. البلوك الواحد يساوي ساعتين، والبلوكات المجانية مشمولة في إجمالي الساعات أعلاه." : "Every pass includes the available games while hosting. Each block gives you 2 hours. Bonus blocks are included in the hours shown above."}</p>
              </div>
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
  const account = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const payment = useProcessPayment();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const returnTo = `${window.location.pathname}${window.location.search}`;

  const beginPayment = () => {
    if (!selected) return;
    setPaymentError(null);
    payment.mutate(
      { data: { packageId: selected.id } },
      {
        onSuccess: ({ paymentUrl }) => window.location.assign(paymentUrl),
        onError: (error) =>
          setPaymentError(
            error instanceof Error
              ? error.message
              : "Unable to open payment page.",
          ),
      },
    );
  };
  return (
    <PublicLayout>
      {(ar) => {
        const t = (en: string, arabic: string) => (ar ? arabic : en);
        return (
          <section className="dd-section dd-container dd-compact-checkout">
            <h1 className="dd-purchase-title">{t("Checkout", "إتمام الشراء")}</h1>
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
              <div className="dd-order dd-checkout-summary">
                  <h2>{ar ? selected.nameAr : selected.name}</h2>
                  <p>{(selected.paid + selected.bonus) * HOURS_PER_BLOCK} {t("hours of game time", "ساعات لعب")}</p>
                  <p dir="auto"><strong>{packagePrice(selected.price, ar)}</strong> · {t("One-time payment", "دفعة واحدة")}</p>
                  {game && <p>{ar ? game.titleAr : game.title}</p>}
                  <Link className="dd-text-link" href="/pricing">{t("Change package", "تغيير الباقة")}</Link>
                  {account.data && (
                    <details>
                      <summary>{t("Billing details", "بيانات الفوترة")}</summary>
                      <p>{account.data.fullName}</p>
                      <p dir="auto">{account.data.email}</p>
                      <p dir="auto">{account.data.phone}</p>
                    </details>
                  )}
                  {account.isLoading ? (
                    <button className="dd-button" disabled>
                      {t("CHECKING ACCOUNT...", "جارٍ التحقق من الحساب...")}
                    </button>
                  ) : account.data ? (
                    <button
                      className="dd-button"
                      onClick={beginPayment}
                      disabled={payment.isPending}
                    >
                      <CreditCard size={18} />
                      {payment.isPending
                        ? t("OPENING PAYMENT...", "جارٍ فتح الدفع...")
                        : t("PAY SECURELY", "ادفع بأمان")}
                    </button>
                  ) : (
                    <Link
                      className="dd-button"
                      href={`/account?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      {t("LOG IN TO CONTINUE", "سجّل الدخول للمتابعة")}
                    </Link>
                  )}
                  <p className="dd-payment-state" role="status">
                    {paymentError?.replace(/^HTTP \d+\s*:\s*/i, "") ??
                      t(
                        "You will complete payment securely on MyFatoorah.",
                        "ستكمل الدفع بأمان عبر ماي فاتورة.",
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
                [
                  "merchant",
                  "Merchant contact details",
                  "بيانات التواصل مع التاجر",
                ],
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

export function PaymentResult() {
  const orderId =
    new URLSearchParams(window.location.search).get("order") ?? "";
  const account = useGetAuthMe({
    query: {
      queryKey: getGetAuthMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
    },
  });
  const order = useGetPaymentOrder(orderId, {
    query: {
      queryKey: ["payment-order", orderId],
      enabled: Boolean(orderId && account.data),
      retry: false,
      refetchInterval: (query) =>
        query.state.data?.status === "pending" ? 3_000 : false,
    },
  });

  return (
    <PublicLayout>
      {(ar) => {
        const t = (en: string, arabic: string) => (ar ? arabic : en);
        const status = order.data?.status;
        const creditedMinutes = order.data?.minutes;
        const title =
          status === "paid"
            ? t("PAYMENT SUCCESSFUL", "تم الدفع بنجاح")
            : status === "failed" || status === "cancelled"
              ? t("PAYMENT NOT COMPLETED", "لم تكتمل عملية الدفع")
              : t("CHECKING YOUR PAYMENT", "جارٍ التحقق من الدفع");
        return (
          <section className="dd-section dd-container dd-payment-result">
            <div className="dd-order">
              <ShieldCheck size={38} />
              <h1>{title}</h1>
              {!orderId && (
                <p>
                  {t(
                    "We could not identify this payment. Please check your account before trying again.",
                    "تعذر تحديد عملية الدفع. تحقق من حسابك قبل المحاولة مرة أخرى.",
                  )}
                </p>
              )}
              {(account.isLoading || order.isLoading) && (
                <p>
                  {t(
                    "Please wait while we confirm the result with MyFatoorah.",
                    "يرجى الانتظار بينما نؤكد النتيجة مع ماي فاتورة.",
                  )}
                </p>
              )}
              {status === "paid" && creditedMinutes !== undefined && (
                <p>
                  {t(
                    `${creditedMinutes} minutes were added to your account.`,
                    `تمت إضافة ${creditedMinutes} دقيقة إلى حسابك.`,
                  )}
                </p>
              )}
              {(status === "failed" || status === "cancelled") && (
                <p>
                  {t(
                    "You were not credited. You can safely try again.",
                    "لم تتم إضافة وقت إلى حسابك. يمكنك المحاولة مرة أخرى بأمان.",
                  )}
                </p>
              )}
              {status === "pending" && (
                <p>
                  {t(
                    "Your payment is still pending. This page will update automatically.",
                    "عملية الدفع لا تزال قيد الانتظار. سيتم تحديث الصفحة تلقائياً.",
                  )}
                </p>
              )}
              {account.isError && (
                <p>
                  {t(
                    "Log in with the account that started this payment to view the result.",
                    "سجّل الدخول بالحساب الذي بدأ عملية الدفع لعرض النتيجة.",
                  )}
                </p>
              )}
              {account.data && order.isError && (
                <p>
                  {t(
                    "We could not load the payment result. Check your account for the updated game time.",
                    "تعذر تحميل نتيجة الدفع. تحقق من حسابك لمعرفة وقت اللعب المحدث.",
                  )}
                </p>
              )}
              <div className="dd-result-actions">
                <Link className="dd-button" href="/account">
                  {t("VIEW ACCOUNT", "عرض الحساب")}
                </Link>
                <Link className="dd-text-link" href="/pricing">
                  {t("VIEW GAME PASSES", "عرض باقات اللعب")}
                </Link>
              </div>
            </div>
          </section>
        );
      }}
    </PublicLayout>
  );
}
