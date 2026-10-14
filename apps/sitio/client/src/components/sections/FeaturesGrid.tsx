import { motion } from "framer-motion";
import FeatureCard from "./FeatureCard";
import { LucideIcon } from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

interface FeaturesGridProps {
  title: string;
  subtitle: string;
  features: Feature[];
  columns?: 2 | 3 | 4;
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { y: 40 },
  visible: {
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

export default function FeaturesGrid({
  title,
  subtitle,
  features,
  columns = 3,
}: FeaturesGridProps) {
  const gridCols = {
    2: "lg:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  }[columns];

  return (
    <section className="py-20 md:py-32 bg-muted/30" data-testid="section-features-grid">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
          initial={{ y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
        >
          <h2
            className="text-4xl md:text-5xl font-bold"
            data-testid="text-features-title"
          >
            {title}
          </h2>
          <p
            className="text-xl text-secondary-foreground font-semibold"
            data-testid="text-features-subtitle"
          >
            {subtitle}
          </p>
        </motion.div>

        <motion.div
          className={`grid grid-cols-1 md:grid-cols-2 ${gridCols} gap-6`}
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <FeatureCard
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                index={index}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
