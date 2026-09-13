import type { SeedList } from "@/lib/kinks/types";

export const common: SeedList = {
  slug: "common",
  name: "Common",
  tagline: "The essentials",
  description: "A short, friendly list of the most common kinks. Great for a first look or for normies.",
  categories: [
    {
      name: "General",
      description: "Basic kinks and fetishes that are commonly explored.",
      items: [
        { name: "Dirty talk", description: "Verbal communication during intimate activities.", options: ["Giving", "Receiving"] },
        { name: "Kissing", description: "Various forms of lip and mouth contact.", options: ["Giving", "Receiving"] },
        { name: "Massaging", description: "The act of massaging in a sexual context.", options: ["Giving", "Receiving"] },
        { name: "Cuddling", description: "The act of cuddling during intimate activities.", options: ["Giving", "Receiving"] },
        { name: "Tickling", description: "The act of tickling in a sexual context.", options: ["Giving", "Receiving"] },
        { name: "Domination", description: "The role during intimate activities.", options: ["Dominant", "Submissive", "Switch"] },
        { name: "Oral sex", description: "Various forms of oral stimulation.", options: ["Giving", "Receiving"] },
        { name: "Masturbation", description: "The act of stimulating oneself sexually." },
        { name: "Handjob/Fingering", description: "Activities involving stimulation by hand.", options: ["Giving", "Receiving"] },
        { name: "Teasing", description: "Physical/verbal foreplay to arouse partner.", options: ["Giving", "Receiving"] },
      ],
    },
    {
      name: "Body",
      description: "Preferences about a partner's body.",
      items: [
        { name: "Size", description: "The size of the partner's body.", options: ["Skinny", "Average", "Chubby", "Muscular"] },
        { name: "Breasts", description: "The size of the partner's breasts.", options: ["Small", "Medium", "Big"] },
        { name: "Ass", description: "The size of the partner's ass.", options: ["Small", "Medium", "Big"] },
        { name: "Penis", description: "The size of the partner's penis.", options: ["Small", "Medium", "Big"] },
        { name: "Pubic Hair", description: "The presence of hair in the groin area." },
        { name: "Piercings", description: "The presence of piercings on the body." },
      ],
    },
    {
      name: "Toys",
      description: "Various toys and implements used in intimate activities.",
      items: [
        { name: "Vibrators", description: "Electronic devices for stimulation." },
        { name: "Dildos", description: "Non-vibrating penetrative toys." },
        { name: "Butt plugs", description: "Toys designed for anal play.", options: ["Small", "Medium", "Large"] },
      ],
    },
    {
      name: "Clothing and accessories",
      description: "Clothing-related fetishes and preferences.",
      items: [
        { name: "Lingerie", description: "Sexy undergarments and intimate apparel.", options: ["Wearing", "Partner wearing"] },
        { name: "Leather", description: "Clothing and accessories made from leather.", options: ["Wearing", "Partner wearing"] },
      ],
    },
    {
      name: "Roleplay",
      description: "Different scenarios and character-based activities.",
      items: [
        { name: "Teacher/Student", description: "Educational authority dynamic roleplay.", options: ["Teacher", "Student"] },
        { name: "Doctor/Patient", description: "Medical examination roleplay scenarios.", options: ["Doctor", "Patient"] },
      ],
    },
    {
      name: "BDSM",
      description: "Activities involving psychological or physical pain, often combined with restraint.",
      items: [
        { name: "Light spanking", description: "Gentle impact play for sensation.", options: ["Giving", "Receiving"] },
        { name: "Nipple clamps", description: "Devices that apply pressure to nipples." },
      ],
    },
    {
      name: "Locations",
      description: "Different settings and environments for activities.",
      items: [
        { name: "Bedroom", description: "Traditional intimate space." },
        { name: "Shower/Bath", description: "Water-based intimate activities." },
      ],
    },
    {
      name: "Misc",
      description: "Other preferences that don't fit into standard categories.",
      items: [
        { name: "Photography", description: "Taking pictures during intimate moments.", options: ["Taking photos", "Being photographed"] },
        { name: "Role reversal", description: "Switching typical roles or dynamics." },
        { name: "Sensory play", description: "Activities focusing on different senses.", options: ["Giving", "Receiving"] },
      ],
    },
  ],
};
