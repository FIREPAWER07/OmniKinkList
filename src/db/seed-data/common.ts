import type { SeedList } from "@/lib/kinks/types";

export const common: SeedList = {
  slug: "common",
  name: "Common",
  tagline: "The essentials",
  description: "A short, friendly list of the most common kinks. Great for a first look or for normies.",
  categories: [
    {
      name: "General",
      icon: "sparkle",
      description: "Core activities most people have an opinion on.",
      items: [
        { name: "Kissing", description: "Mouth-to-mouth and mouth-to-body kissing.", variants: ["Soft", "Deep", "Neck"] },
        { name: "Oral sex", description: "Using the mouth on a partner's genitals.", roles: ["Giving", "Receiving"] },
        { name: "Manual stimulation", description: "Using hands and fingers on a partner's genitals.", roles: ["Giving", "Receiving"] },
        { name: "Anal play", description: "Stimulation of the anus, from light touch to penetration.", roles: ["Giving", "Receiving"] },
        { name: "Masturbation", description: "Pleasuring yourself, alone or with a partner watching." },
        { name: "Dirty talk", description: "Saying explicit things out loud to turn each other on.", roles: ["Talking", "Listening"] },
        { name: "Teasing", description: "Building anticipation before giving what's wanted.", roles: ["Teasing", "Being teased"] },
        { name: "Massage", description: "Rubbing and kneading the body to relax or arouse.", roles: ["Giving", "Receiving"] },
        { name: "Cuddling", description: "Holding each other close before, during, or after.", roles: ["Big spoon", "Little spoon"] },
        { name: "Tickling", description: "Tickling as flirting or play.", roles: ["Giving", "Receiving"] },
        { name: "Power exchange", description: "One person takes the lead and the other follows, by agreement.", roles: ["Dominant", "Submissive", "Switch"] },
      ],
    },
    {
      name: "Body",
      icon: "person",
      description: "What you find attractive in a partner's body.",
      items: [
        { name: "Body type", description: "Overall build.", variants: ["Slim", "Average", "Curvy or chubby", "Muscular"] },
        { name: "Chest size", description: "Size of a partner's chest or breasts.", variants: ["Flat", "Small", "Medium", "Large"] },
        { name: "Butt size", description: "Size of a partner's butt.", variants: ["Small", "Medium", "Large"] },
        { name: "Penis size", description: "Only relevant if your partner has a penis.", variants: ["Small", "Average", "Large"] },
        { name: "Body hair", description: "Hair on the body and around the genitals.", variants: ["Shaved", "Trimmed", "Natural"] },
        { name: "Piercings", description: "Piercings on a partner's body." },
        { name: "Tattoos", description: "Tattoos on a partner's body." },
      ],
    },
    {
      name: "Toys",
      icon: "magic-wand",
      description: "Devices and tools made for pleasure.",
      items: [
        { name: "Vibrators", description: "Toys that vibrate for external or internal stimulation.", roles: ["Using on myself", "Using on a partner", "Partner using on me"] },
        { name: "Dildos", description: "Non-vibrating toys for penetration.", roles: ["Using on myself", "Using on a partner", "Partner using on me"] },
        { name: "Butt plugs", description: "Anal toys shaped to stay in place.", roles: ["Wearing", "Partner wearing"], variants: ["Small", "Medium", "Large"] },
      ],
    },
    {
      name: "Clothing and accessories",
      icon: "t-shirt",
      description: "Outfits and materials that add to the mood.",
      items: [
        { name: "Lingerie", description: "Sexy underwear and intimate outfits.", roles: ["Wearing", "Partner wearing"] },
        { name: "Leather", description: "Clothing and gear made of leather.", roles: ["Wearing", "Partner wearing"] },
        { name: "Latex and rubber", description: "Tight, shiny synthetic outfits.", roles: ["Wearing", "Partner wearing"] },
      ],
    },
    {
      name: "Roleplay",
      icon: "mask-happy",
      description: "Acting out characters and scenarios.",
      items: [
        { name: "Teacher and student", description: "An authority and learning scenario between adults.", roles: ["Teacher", "Student"] },
        { name: "Doctor and patient", description: "A medical exam scenario.", roles: ["Doctor or nurse", "Patient"] },
        { name: "Boss and employee", description: "A workplace power scenario.", roles: ["Boss", "Employee"] },
      ],
    },
    {
      name: "BDSM",
      icon: "link",
      description: "Restraint, impact, and sensation play, from gentle to intense.",
      items: [
        { name: "Handcuffs", description: "Cuffs that hold the wrists together.", roles: ["Cuffing", "Being cuffed"] },
        { name: "Light spanking", description: "Playful slaps on the butt or thighs.", roles: ["Giving", "Receiving"] },
        { name: "Nipple play", description: "Pinching or clamping the nipples.", roles: ["Giving", "Receiving"], variants: ["Pinching", "Clamps"] },
        { name: "Ice play", description: "Using cold to contrast with warm skin.", roles: ["Giving", "Receiving"] },
        { name: "Blindfolds", description: "Taking away sight to sharpen everything else.", roles: ["Blindfolding", "Being blindfolded"] },
      ],
    },
    {
      name: "Locations",
      icon: "map-pin",
      description: "Where it happens.",
      items: [
        { name: "Bedroom", description: "The classic, private setting." },
        { name: "Shower and bath", description: "Anywhere with water." },
        { name: "Outdoors", description: "Out in nature, somewhere private enough." },
      ],
    },
    {
      name: "Misc",
      icon: "dots-three",
      description: "Everything that doesn't fit elsewhere.",
      items: [
        { name: "Photos", description: "Taking intimate pictures.", roles: ["Taking photos", "Being photographed"] },
        { name: "Sensory play", description: "Playing with touch, sound, taste, and smell.", roles: ["Giving", "Receiving"] },
      ],
    },
  ],
};
