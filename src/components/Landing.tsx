"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function Landing() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-24 pt-8">
      {/* Nav */}
      <header className="mb-16 flex items-center justify-between md:mb-24">
        <span className="font-display text-2xl font-medium tracking-tight text-sage-deep">
          Thicket
        </span>
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-medium text-brown/60 transition-colors hover:bg-surface hover:text-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          Log in
        </Link>
      </header>

      {/* Hero */}
      <motion.div
        initial="initial"
        animate="animate"
        transition={{ type: "spring", stiffness: 420, damping: 30 }}
        variants={fadeUp}
      >
        <h1 className="font-display text-4xl font-medium leading-[1.15] tracking-tight text-brown md:text-5xl">
          Lunch, 45k.
          <br />
          Call the dentist.
          <br />
          <span className="text-sage-deep">Same feed.</span>
        </h1>

        <p className="mt-6 max-w-md text-base text-brown/60">
          Thicket keeps every expense and every to-do in one running,
          chronological list. No separate apps, no context switching, just what
          happened and what&apos;s next, in the order it occurred to you.
        </p>
        <p className="mt-3 max-w-md text-base text-brown/60">
          Most tracking apps make you choose a category, a due date, a project,
          before you&apos;re even allowed to save the thought. Thicket skips
          that. Type it, hit enter, and it&apos;s logged. The organizing happens
          later, automatically, in the feed itself.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-sage-deep px-6 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          >
            Start your feed
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-brown/60 underline underline-offset-4 transition-colors hover:text-brown focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
          >
            Already have an account?
          </Link>
        </div>
      </motion.div>

      {/* Explanation */}
      <motion.div
        initial="initial"
        animate="animate"
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
          delay: 0.08,
        }}
        variants={fadeUp}
        className="mt-20 grid grid-cols-1 gap-4 md:mt-28 md:grid-cols-2"
      >
        <div className="rounded-soft bg-surface p-5 shadow-sm">
          <p className="font-display text-sm font-medium text-sage-deep">
            Capture
          </p>
          <p className="mt-2 text-sm text-brown/60">
            Add an expense or a task in seconds. Type it, submit it, move on.
            Nothing else to fill in unless you want to.
          </p>
        </div>
        <div className="rounded-soft bg-surface p-5 shadow-sm">
          <p className="font-display text-sm font-medium text-sage-deep">
            One timeline
          </p>
          <p className="mt-2 text-sm text-brown/60">
            Everything lands in a single chronological feed, so today&apos;s
            spending and today&apos;s to-dos sit side by side, in the order they
            actually happened.
          </p>
        </div>
      </motion.div>
      {/* How it works */}
      <motion.div
        initial="initial"
        animate="animate"
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
          delay: 0.14,
        }}
        variants={fadeUp}
        className="mt-16 md:mt-20"
      >
        <p className="font-display text-sm font-medium text-sage-deep">
          How it works
        </p>
        <ol className="mt-4 flex flex-col gap-5">
          <li className="flex gap-4">
            <span className="font-display text-sm text-brown/30">1</span>
            <div>
              <p className="text-sm font-medium text-brown">Type it</p>
              <p className="mt-1 text-sm text-brown/60">
                Open Thicket, type what happened. &ldquo;Lunch, 45k&rdquo; or
                &ldquo;call the dentist.&rdquo; No fields to choose first.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-sm text-brown/30">2</span>
            <div>
              <p className="text-sm font-medium text-brown">
                It lands in the feed
              </p>
              <p className="mt-1 text-sm text-brown/60">
                Every entry drops into one chronological list, expenses and
                tasks together, newest first.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="font-display text-sm text-brown/30">3</span>
            <div>
              <p className="text-sm font-medium text-brown">See the pattern</p>
              <p className="mt-1 text-sm text-brown/60">
                Check the week&apos;s spending and open tasks right there,
                without digging through history.
              </p>
            </div>
          </li>
        </ol>
      </motion.div>

      {/* Footer */}
      <footer className="mt-20 border-t border-brown/10 pt-6 md:mt-28">
        <p className="text-xs text-brown/40">
          Thicket &middot; a quiet place to log things
        </p>
      </footer>
    </div>
  );
}
