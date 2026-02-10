"use client";
import { cn } from "@/lib/utils";
import { Menu as IconMenu2, X as IconX } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import Link from "next/link";

import React, { useRef, useState } from "react";


interface NavbarProps {
  children: React.ReactNode;
  className?: string;
}

interface NavBodyProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface NavItemsProps {
  items: {
    name: string;
    link: string;
  }[];
  className?: string;
  onItemClick?: () => void;
}

interface MobileNavProps {
  children: React.ReactNode;
  className?: string;
  visible?: boolean;
}

interface MobileNavHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MobileNavMenuProps {
  children: React.ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const Navbar = ({ children, className }: NavbarProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const [visible, setVisible] = useState<boolean>(false);
  const [lastScrollY, setLastScrollY] = useState<number>(0);

  useMotionValueEvent(scrollY, "change", (latest) => {
    const currentScrollY = latest;
    
    // Show navbar when scrolling up or at the top
    if (currentScrollY < lastScrollY || currentScrollY < 10) {
      setVisible(true);
    } 
    // Hide when scrolling down and past 100px
    else if (currentScrollY > 100 && currentScrollY > lastScrollY) {
      setVisible(false);
    }
    
    setLastScrollY(currentScrollY);
  });

  return (
    <motion.div
      ref={ref}
      animate={{
        y: visible || scrollY.get() < 100 ? 0 : -100,
      }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
      }}
      // IMPORTANT: Change this to class of `fixed` if you want the navbar to be fixed
      className={cn("fixed inset-x-0 top-0 z-50 w-full", className)}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(
              child as React.ReactElement<{ visible?: boolean }>,
              { visible: scrollY.get() > 50 },
            )
          : child,
      )}
    </motion.div>
  );
};

export const NavBody = ({ children, className, visible }: NavBodyProps) => {
  const childrenArray = React.Children.toArray(children);
  
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(20px) saturate(180%)" : "none",
        width: visible ? "96%" : "100%",
        y: visible ? 16 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 30,
      }}
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl items-center justify-between self-start bg-transparent px-4 py-3 xl:px-6 lg:flex",
        visible && "bg-background/80 border-2 border-border/60 backdrop-blur-xl shadow-lg",
        visible ? "rounded-[calc(var(--radius)+0.5rem)]" : "rounded-none",
        className,
      )}
    >
      <div className="flex items-center flex-shrink-0 relative z-30 min-w-0 mr-2 xl:mr-4">
        {childrenArray[0]}
      </div>
      <div className="flex-1 flex items-center justify-center min-w-0 overflow-x-hidden px-2 xl:px-4">
        {childrenArray[1]}
      </div>
      <div className="flex items-center gap-2 xl:gap-3 flex-shrink-0 relative z-30 min-w-0 ml-2 xl:ml-4">
        {childrenArray[2]}
      </div>
    </motion.div>
  );
};

export const NavItems = ({ items, className, onItemClick }: NavItemsProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <motion.div
      onMouseLeave={() => setHovered(null)}
      className={cn(
        "flex flex-row items-center justify-center space-x-0 xl:space-x-0.5 text-sm font-medium",
        className,
      )}
    >
      {items.map((item, idx) => (
        <Link
          key={`link-${idx}`}
          href={item.link}
          onMouseEnter={() => setHovered(idx)}
          onClick={onItemClick}
          className="relative px-1.5 xl:px-2.5 py-2 text-foreground/80 hover:text-foreground transition-colors duration-200 whitespace-nowrap"
        >
          {hovered === idx && (
            <motion.div
              layoutId="hovered"
              className="absolute inset-0 h-full w-full rounded-[var(--radius)] bg-accent"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-20">{item.name}</span>
        </Link>
      ))}
    </motion.div>
  );
};

export const MobileNav = ({ children, className, visible }: MobileNavProps) => {
  return (
    <motion.div
      animate={{
        backdropFilter: visible ? "blur(20px) saturate(180%)" : "none",
        width: visible ? "92%" : "100%",
        paddingRight: visible ? "16px" : "0px",
        paddingLeft: visible ? "16px" : "0px",
        y: visible ? 12 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 30,
      }}
      className={cn(
        "relative z-50 mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-transparent px-0 py-3 lg:hidden",
        visible && "bg-background/80 border-2 border-border/60 backdrop-blur-xl shadow-lg",
        visible ? "rounded-[var(--radius)]" : "rounded-none",
        className,
      )}
    >
      {children}
    </motion.div>
  );
};

export const MobileNavHeader = ({
  children,
  className,
}: MobileNavHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-row items-center justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const MobileNavMenu = ({
  children,
  className,
  isOpen,
  onClose,
}: MobileNavMenuProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "absolute inset-x-0 top-[4.5rem] z-50 flex w-full flex-col items-start justify-start gap-3 px-6 py-6 border-2",
            "bg-background/85 backdrop-blur-xl border-border/60 shadow-lg",
            "rounded-[var(--radius)]",
            className,
          )}
          style={{
            backdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const MobileNavToggle = ({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-[calc(var(--radius)-0.25rem)] hover:bg-accent transition-colors duration-200 cursor-pointer"
      aria-label={isOpen ? "Close menu" : "Open menu"}
    >
      {isOpen ? (
        <IconX className="h-5 w-5 text-foreground" />
      ) : (
        <IconMenu2 className="h-5 w-5 text-foreground" />
      )}
    </button>
  );
};

export const NavbarLogo = () => {
  return (
    <a
      href="#"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
    >
      <img
        src="https://assets.aceternity.com/logo-dark.png"
        alt="logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">Startup</span>
    </a>
  );
};

export const NavbarButton = ({
  href,
  as: Tag = "a",
  children,
  className,
  variant = "primary",
  ...props
}: {
  href?: string;
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
} & (
  | React.ComponentPropsWithoutRef<"a">
  | React.ComponentPropsWithoutRef<"button">
)) => {
  const baseStyles =
    "h-8 xl:h-9 px-3 xl:px-4 py-2 text-xs xl:text-sm font-medium relative cursor-pointer transition-all duration-200 inline-flex items-center justify-center whitespace-nowrap";

  const variantStyles = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 rounded-[var(--radius)] shadow-sm hover:shadow-md hover:-translate-y-0.5",
    secondary: 
      "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-[var(--radius)] shadow-sm",
    ghost: 
      "bg-transparent hover:bg-accent hover:text-accent-foreground rounded-[var(--radius)]",
  };

  return (
    <Tag
      href={href || undefined}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {children}
    </Tag>
  );
};
