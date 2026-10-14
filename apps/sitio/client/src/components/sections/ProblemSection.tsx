import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import membershipIllustration from "@assets/recurso-13-membresias.webp";

interface ProblemSectionProps {
  question: string;
  solution: string;
  description: string;
  benefits: string[];
  image: string;
  imageAlt: string;
  /** Dimensiones reales de la imagen: reservan su hueco y evitan el salto de layout. */
  anchoImagen?: number;
  altoImagen?: number;
  reverse?: boolean;
}

const benefitVariants = {
  hidden: { x: -20 },
  visible: {
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

export default function ProblemSection({
  question,
  solution,
  description,
  benefits,
  image,
  imageAlt,
  anchoImagen,
  altoImagen,
  reverse = false,
}: ProblemSectionProps) {
  return (
    <section className="py-20 md:py-32" data-testid="section-problem">
      <div className="container mx-auto px-4 md:px-8">
        <div
          className={`grid md:grid-cols-2 gap-12 items-center ${reverse ? "md:flex-row-reverse" : ""}`}
        >
          {/* Content side */}
          <div className={`space-y-6 ${reverse ? "md:order-2" : ""}`}>
            <motion.h2
              className="text-4xl md:text-5xl font-bold leading-tight"
              data-testid="text-question"
              initial={{ x: reverse ? 40 : -40 }}
              whileInView={{ x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
            >
              {question}
            </motion.h2>

            <motion.div
              className="space-y-4"
              initial={{ y: 20 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <h3
                className="text-2xl md:text-3xl font-semibold text-secondary-foreground"
                data-testid="text-solution"
              >
                {solution}
              </h3>
              <p className="text-lg text-muted-foreground" data-testid="text-description">
                {description}
              </p>
            </motion.div>

            <motion.ul
              className="space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              transition={{ staggerChildren: 0.1, delayChildren: 0.4 }}
            >
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  className="flex items-start gap-3"
                  data-testid={`benefit-${index}`}
                  variants={benefitVariants}
                >
                  <motion.div
                    className="mt-1 rounded-full bg-secondary p-1"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{
                      delay: 0.5 + index * 0.1,
                      type: "spring",
                      stiffness: 400,
                    }}
                  >
                    <Check className="w-4 h-4 text-primary" />
                  </motion.div>
                  <span className="text-foreground">{benefit}</span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          {/* Image side */}
          <motion.div
            className={reverse ? "md:order-1" : ""}
            initial={{ y: 60 }}
            whileInView={{ y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          >
            <div className="relative">
              <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <Card className="p-8 backdrop-blur-sm bg-card/80 border-card-border">
                  <img
                    src={image}
                    alt={imageAlt}
                    width={anchoImagen}
                    height={altoImagen}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto rounded-xl"
                    data-testid="img-problem-illustration"
                  />
                </Card>
              </motion.div>

              {/* Decorative elements */}
              <motion.div
                className="absolute -z-10 -top-6 -right-6 w-full h-full bg-gradient-to-br from-primary/10 to-transparent rounded-2xl"
                initial={{ scale: 0.9 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function MembershipProblemSection() {
  return (
    <ProblemSection
      question="¿Aún gestionas tus membresías de forma manual?"
      solution="Nuestra solución:"
      description="Automatiza y genera más ingresos con una plataforma profesional."
      benefits={[
        "Renueva y gestiona membresías sin esfuerzo",
        "Control de acceso personalizado por tipo de membresía",
        "Pagos integrados y automatizados",
        "Beneficios exclusivos para cada nivel",
      ]}
      image={membershipIllustration}
      imageAlt="Automatización de membresías"
      anchoImagen={960}
      altoImagen={998}
    />
  );
}
