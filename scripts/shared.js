// Kink list data and parsing functionality

// Category explanations
const categoryExplanations = {
    "General": "Basic kinks and fetishes that are commonly explored.",
    "Body": "Preferences of the body.",
    "Toys": "Various toys and implements used in intimate activities.",
    "Clothing": "Clothing-related fetishes and preferences.",
    "Roleplay": "Different scenarios and character-based activities.",
    "Bondage": "Restraint and control-based activities.",
    "Pain": "Activities involving various levels of physical sensation.",
    "Taboo": "More extreme or unconventional preferences.",
    "Romantic": "Intimate and emotionally connected activities.",
    "Locations": "Different settings and environments for activities.",
    "Misc": "Other preferences that don't fit into standard categories."
};

// Kink list data for different versions
const kinklistData = {
    common: `
#General
* Dirty talk
? Verbal communication during intimate activities.
@ Giving,Receiving

* Kissing
? Various forms of lip and mouth contact.
@ Giving,Receiving

* Tickling
? The act of tickling in a sexual context.
@ Giving,Receiving

* Domination
? The role during intimate activites.
@ Dominant,Submissive,Switch

* Oral sex
? Various forms of oral stimulation.
@ Giving,Receiving

* Masturbation
? The act of stimulating oneself sexually.

* Handjob/Fingering
? Activities involving stimulation by hand.
@ Giving,Receiving

* Teasing
? Physical/verbal foreplay to arouse partner.
@ Giving,Receiving

* Anal play
? Activities involving anal stimulation and penetration.
@ Giving,Receiving

#Body
* Size
? The size of the partner's body.
@ Skinny,Average,Chubby,Muscular

* Breasts
? The size of the partner's breasts.
@ Small,Medium,Big

* Ass
? The size of the partner's ass.
@ Small,Medium,Big

* Penis
? The size of the partner's penis.
@ Small,Medium,Big

* Pubic Hair
? The presence of hair in the groin area.

#Toys
* Vibrators
? Electronic devices for stimulation.

* Dildos
? Non-vibrating penetrative toys.

* Butt plugs
? Toys designed for anal play.
@ Small,Medium,Large

* Handcuffs
? Restraint devices for wrists.

#Clothing
* Lingerie
? Sexy undergarments and intimate apparel.
@ Wearing,Partner wearing

* Leather
? Clothing and accessories made from leather.
@ Wearing,Partner wearing

* Latex/Rubber
? Tight-fitting synthetic materials.
@ Wearing,Partner wearing

#Roleplay
* Teacher/Student
? Educational authority dynamic roleplay.
@ Teacher,Student

* Doctor/Patient
? Medical examination roleplay scenarios.
@ Doctor,Patient

* Boss/Employee
? Workplace power dynamic scenarios.
@ Boss,Employee

#Pain
* Light spanking
? Gentle impact play for sensation.
@ Giving,Receiving

* Nipple clamps
? Devices that apply pressure to nipples.

* Ice play
? Using cold temperatures for sensation.
@ Giving,Receiving

#Romantic
* Massage
? Sensual touching and body work.
@ Giving,Receiving

* Kissing
? Various forms of lip and mouth contact.

* Cuddling
? Close physical contact and embracing.

#Locations
* Bedroom
? Traditional intimate space.

* Shower/Bath
? Water-based intimate activities.

* Outdoors
? Nature-based intimate encounters.

#Misc
* Photography
? Taking pictures during intimate moments.
@ Taking photos,Being photographed

* Role reversal
? Switching typical roles or dynamics.

* Sensory play
? Activities focusing on different senses.
@ Giving,Receiving
`,

    uncommon: `
#General
* Anal play
? Activities involving anal stimulation, fingering, toys, or penetration with varying intensity levels.
@ Giving,Receiving,Watching

* Oral sex
? Various forms of oral stimulation including different techniques and positions.
@ Giving,Receiving,Mutual

* Spanking
? Impact play using hands on buttocks or other body parts, ranging from light to firm.
@ Giving,Receiving,Watching

* Hair pulling
? Tugging or pulling hair during intimate moments, from gentle to firm grip.
@ Doing,Receiving

* Dirty talk
? Verbal communication during intimate activities, including descriptions and commands.
@ Talking,Listening

* Fingering
? Manual stimulation using fingers for various forms of touch and penetration.
@ Giving,Receiving

* Masturbation
? Self-stimulation activities, solo or in presence of others.
@ Solo,Mutual,Watching

#Toys
* Vibrators
? Electronic devices for stimulation with various speeds, patterns, and intensities.
@ Using on self,Using on partner,Partner using on me

* Dildos
? Non-vibrating penetrative toys in various sizes and materials.
@ Using,Partner using,Double-ended

* Butt plugs
? Toys designed specifically for anal play and training in different sizes.
@ Small,Medium,Large,Wearing long-term

* Handcuffs
? Metal or fabric restraint devices for wrists, ranging from decorative to secure.
@ Using,Wearing,Fuzzy,Metal

* Cock rings
? Rings worn around penis or testicles for enhanced sensation and endurance.
@ Wearing,Partner wearing,Vibrating

* Strap-ons
? Harness and dildo combinations for penetrative play.
@ Wearing,Partner wearing,Receiving

#Clothing
* Lingerie
? Sexy undergarments including bras, panties, corsets, and intimate apparel.
@ Wearing,Partner wearing,Shopping for

* Leather
? Clothing and accessories made from leather including pants, corsets, and harnesses.
@ Wearing,Partner wearing,Smell

* Latex/Rubber
? Tight-fitting synthetic materials that create unique sensations and appearance.
@ Wearing,Partner wearing,Full body

* Stockings/Pantyhose
? Leg coverings that enhance appearance and provide tactile sensations.
@ Wearing,Partner wearing,Ripping off

* High heels
? Footwear that changes posture and adds height, often considered sexy.
@ Wearing,Partner wearing,Worship

* Uniforms
? Specific clothing associated with professions or roles for roleplay scenarios.
@ Wearing,Partner wearing,Multiple types

#Roleplay
* Teacher/Student
? Educational authority dynamic with power exchange and learning scenarios.
@ Teacher,Student,Detention

* Doctor/Patient
? Medical examination scenarios with professional and intimate elements.
@ Doctor,Patient,Nurse

* Boss/Employee
? Workplace power dynamics with authority and submission elements.
@ Boss,Employee,Interview

* Maid/Master
? Service-oriented roleplay with domestic and personal care elements.
@ Maid,Master,French maid

* Police/Criminal
? Law enforcement scenarios with authority, interrogation, and consequences.
@ Police,Criminal,Arrest

* Stranger scenarios
? Meeting and interacting as if meeting for the first time in various settings.
@ Pickup,Bar meeting,Online dating

#Bondage
* Rope bondage
? Using rope for restraint, artistic purposes, and creating beautiful patterns on the body.
@ Tying,Being tied,Shibari,Suspension

* Blindfolding
? Removing the sense of sight to heighten other senses and create anticipation.
@ Blindfolding,Being blindfolded,Sensory deprivation

* Gagging
? Restricting speech using various gags from simple to elaborate designs.
@ Gagging,Being gagged,Ball gag,Tape

* Spreader bars
? Devices that keep legs or arms apart, preventing closure and creating vulnerability.
@ Using,Wearing,Ankle,Wrist

* Restraint furniture
? Specialized furniture designed for bondage including crosses, benches, and frames.
@ Using,Being restrained,St. Andrew's cross

* Chastity devices
? Devices that prevent sexual activity or stimulation for extended periods.
@ Wearing,Partner wearing,Key holding

#Pain
* Light spanking
? Gentle impact play using hands for warming up and light sensation.
@ Giving,Receiving,Over clothes,Bare

* Paddle spanking
? Using paddles for more intense impact play with different materials and textures.
@ Giving,Receiving,Leather,Wood

* Flogging
? Using floggers with multiple tails for varied sensations across the body.
@ Giving,Receiving,Leather,Suede

* Caning
? Using canes for precise, intense impact play that creates specific sensations.
@ Giving,Receiving,Light,Heavy

* Nipple clamps
? Devices that apply adjustable pressure to nipples for pain and pleasure.
@ Wearing,Partner wearing,Chain,Weights

* Hot wax
? Dripping warm wax on the body for temperature play and sensation.
@ Giving,Receiving,Candles,Different temperatures

* Ice play
? Using cold temperatures for contrasting sensations and temperature play.
@ Giving,Receiving,Cubes,Melting

* Pinching
? Using fingers or devices to create sharp, localized sensations.
@ Giving,Receiving,Nipples,Thighs

#Taboo
* Age play
? Roleplay involving age differences or regression scenarios with consenting adults.
@ Older,Younger,Caregiver,Little

* Pet play
? Taking on animal personas with associated behaviors and care dynamics.
@ Pet,Owner,Puppy,Kitten

* Watersports
? Activities involving urine in various contexts and scenarios.
@ Giving,Receiving,Golden shower,Marking

* Exhibitionism
? Being seen by others during intimate activities or in states of undress.
@ Being watched,Watching,Public,Semi-public

* Voyeurism
? Watching others during intimate activities with their knowledge and consent.
@ Watching,Being watched,Couples,Solo

* Group activities
? Intimate activities involving more than two people in various configurations.
@ Threesome,Foursome,Orgy,Swinging

#Romantic
* Massage
? Sensual touching and body work for relaxation, arousal, and connection.
@ Giving,Receiving,Full body,Erotic

* Kissing
? Various forms of lip and mouth contact from gentle to passionate.
@ Light,Deep,Neck,Body

* Cuddling
? Close physical contact and embracing for comfort and intimacy.
@ Big spoon,Little spoon,Face to face

* Sensual bathing
? Intimate washing and care activities in water settings.
@ Giving,Receiving,Together,Bubble bath

* Romantic dinner
? Intimate dining experiences that enhance connection and anticipation.
@ Cooking,Being cooked for,Feeding,Aphrodisiacs

* Dancing
? Moving together to music in intimate and sensual ways.
@ Leading,Following,Slow,Grinding

#Locations
* Bedroom
? Traditional intimate space with comfort and privacy.
@ Own,Partner's,Hotel,Different beds

* Shower/Bath
? Water-based intimate activities with unique sensations and cleanliness.
@ Shower,Bath,Hot tub,Pool

* Outdoors
? Nature-based intimate encounters with risk and natural settings.
@ Forest,Beach,Garden,Balcony

* Car
? Vehicle-based intimate activities with space constraints and mobility.
@ Backseat,Front seat,Parked,Moving

* Public places
? Semi-public locations with risk of discovery and excitement.
@ Bathroom,Changing room,Office,Elevator

* Kitchen
? Food-related intimate activities and domestic settings.
@ Counter,Table,Floor,With food

#Misc
* Photography
? Taking pictures during intimate moments for memory and artistic purposes.
@ Taking photos,Being photographed,Video,Polaroid

* Role reversal
? Switching typical roles or dynamics for variety and exploration.
@ Dom/sub,Top/bottom,Active/passive

* Sensory play
? Activities focusing on different senses beyond sight including touch, sound, taste.
@ Giving,Receiving,Feathers,Textures

* Edging
? Bringing to the brink of climax repeatedly without allowing release.
@ Giving,Receiving,Self,Extended

* Orgasm control
? Managing and controlling climax timing and intensity.
@ Controlling,Being controlled,Denial,Permission

* Aftercare
? Post-activity care and attention for emotional and physical well-being.
@ Giving,Receiving,Cuddling,Talking
`,

    omni: `
#General
* Anal play
? Comprehensive anal activities including fingering, rimming, toys, and penetration with various techniques and intensities.
@ Giving,Receiving,Watching,Rimming,Fingering,Toys,Penetration

* Oral sex
? Extensive oral stimulation techniques including different positions, depths, and styles of giving and receiving pleasure.
@ Giving,Receiving,Mutual,Deep throat,Teasing,Swallowing,69

* Spanking
? Impact play using hands on various body parts with different intensities, positions, and emotional contexts.
@ Giving,Receiving,Watching,Light,Hard,Over clothes,Bare,Punishment,Playful

* Hair pulling
? Various techniques of hair manipulation from gentle tugging to firm grips during different activities.
@ Doing,Receiving,Gentle,Firm,During sex,During kissing

* Dirty talk
? Verbal communication during intimate activities including descriptions, commands, praise, and degradation.
@ Talking,Listening,Commanding,Praising,Degrading,Begging

* Fingering
? Manual stimulation using fingers with various techniques, speeds, and combinations for different types of pleasure.
@ Giving,Receiving,Vaginal,Anal,Multiple fingers,G-spot,Squirting

* Masturbation
? Self-stimulation activities in various contexts including solo, mutual, instructed, and watched scenarios.
@ Solo,Mutual,Watching,Being watched,Instructed,Phone sex,Video chat

* Grinding
? Rubbing bodies together for stimulation through clothing or skin-to-skin contact in various positions.
@ Giving,Receiving,Clothed,Naked,Lap dancing,Dry humping

#Toys
* Vibrators
? Electronic stimulation devices with various features, intensities, and applications for different body parts.
@ Using on self,Using on partner,Partner using on me,Bullet,Wand,Rabbit,Remote control

* Dildos
? Non-vibrating penetrative toys in various sizes, shapes, and materials for different types of play.
@ Using,Partner using,Double-ended,Realistic,Fantasy,Glass,Silicone

* Butt plugs
? Anal toys designed for insertion and wearing with various sizes, shapes, and special features.
@ Small,Medium,Large,Wearing long-term,Tail plugs,Jeweled,Inflatable

* Handcuffs
? Restraint devices for wrists in various materials and styles from decorative to secure bondage.
@ Using,Wearing,Fuzzy,Metal,Leather,Chain,Behind back,To bed

* Cock rings
? Rings for penis and testicles with various features for enhanced sensation, endurance, and appearance.
@ Wearing,Partner wearing,Vibrating,Adjustable,Metal,Silicone,With prostate stimulator

* Strap-ons
? Harness and dildo combinations for penetrative play with various configurations and accessories.
@ Wearing,Partner wearing,Receiving,Double-ended,Strapless,Hollow,Realistic

* Nipple toys
? Devices and accessories specifically designed for nipple stimulation and sensation play.
@ Clamps,Suction,Vibrating,Weights,Chains,Pumps,Jewelry

* Anal beads
? Graduated beads designed for anal insertion and removal for unique sensations.
@ Using,Partner using,Small,Large,Vibrating,Removal during orgasm

#Clothing
* Lingerie
? Sexy undergarments and intimate apparel including various styles, materials, and purposes.
@ Wearing,Partner wearing,Shopping for,Bras,Panties,Corsets,Babydolls,Crotchless

* Leather
? Clothing and accessories made from leather including various garments and their associated sensations.
@ Wearing,Partner wearing,Smell,Pants,Corsets,Harnesses,Gloves,Boots

* Latex/Rubber
? Tight-fitting synthetic materials that create unique sensations, appearance, and psychological effects.
@ Wearing,Partner wearing,Full body,Catsuit,Gloves,Masks,Smell,Shining

* Stockings/Pantyhose
? Leg coverings that enhance appearance and provide tactile sensations in various styles and contexts.
@ Wearing,Partner wearing,Ripping off,Thigh highs,Fishnet,Seamed,Worship

* High heels
? Footwear that changes posture and adds height, often considered sexy and used in various scenarios.
@ Wearing,Partner wearing,Worship,Trampling,Stilettos,Boots,During sex

* Uniforms
? Specific clothing associated with professions or roles for roleplay scenarios and fantasy fulfillment.
@ Wearing,Partner wearing,Nurse,Police,Military,School,Maid,Business

* Crossdressing
? Wearing clothing typically associated with a different gender for various purposes and scenarios.
@ Self,Partner,Full transformation,Partial,Makeup,Wigs,Public

* Nudity
? Being without clothing in various contexts and settings for different purposes and sensations.
@ Self,Partner,Public,Semi-public,Home,Outdoors,Sleeping,Casual

#Roleplay
* Teacher/Student
? Educational authority dynamics with power exchange, learning scenarios, and various educational settings.
@ Teacher,Student,Detention,Private tutoring,Punishment,Rewards,Uniform

* Doctor/Patient
? Medical examination scenarios with professional elements, intimate examinations, and healthcare roleplay.
@ Doctor,Patient,Nurse,Examination,Treatment,Medical equipment,Hospital

* Boss/Employee
? Workplace power dynamics with authority, submission, professional settings, and career consequences.
@ Boss,Employee,Interview,Performance review,Overtime,Office,Promotion

* Maid/Master
? Service-oriented roleplay with domestic duties, personal care, and various levels of formality.
@ Maid,Master,French maid,Butler,Cleaning,Service,Uniform,Orders

* Police/Criminal
? Law enforcement scenarios with authority, interrogation, consequences, and justice themes.
@ Police,Criminal,Arrest,Interrogation,Handcuffs,Uniform,Traffic stop

* Stranger scenarios
? Meeting and interacting as if strangers in various settings and situations for excitement and novelty.
@ Pickup,Bar meeting,Online dating,Vacation,Hotel,Fake names,Different personas

* Fantasy characters
? Taking on fictional or mythical personas for creative and imaginative roleplay scenarios.
@ Vampire,Werewolf,Fairy,Demon,Angel,Superhero,Villain,Medieval

* Historical periods
? Roleplay set in different time periods with appropriate costumes, language, and scenarios.
@ Victorian,Medieval,1950s,Ancient,Pirate,Cowboy,Roman,Egyptian

#Bondage
* Rope bondage
? Using rope for restraint, artistic purposes, and creating beautiful patterns with various techniques and styles.
@ Tying,Being tied,Shibari,Kinbaku,Suspension,Hogtie,Spread eagle,Artistic

* Blindfolding
? Removing sight to heighten other senses, create anticipation, and enhance psychological elements.
@ Blindfolding,Being blindfolded,Sensory deprivation,Sleep mask,Scarf,Hood

* Gagging
? Restricting speech using various types of gags for control, humiliation, and sensory experiences.
@ Gagging,Being gagged,Ball gag,Bit gag,Tape,Panties,Ring gag,Inflatable

* Spreader bars
? Devices that keep limbs apart, preventing closure and creating vulnerability in various positions.
@ Using,Wearing,Ankle,Wrist,Adjustable,Fixed,Standing,Lying

* Restraint furniture
? Specialized furniture designed for bondage including various pieces for different positions and activities.
@ Using,Being restrained,St. Andrew's cross,Bondage bed,Stocks,Pillory,Suspension frame

* Chastity devices
? Devices that prevent sexual activity or stimulation for control, denial, and power exchange.
@ Wearing,Partner wearing,Key holding,Male,Female,Long-term,Teasing

* Collars
? Neck accessories that symbolize ownership, submission, and various relationship dynamics.
@ Wearing,Partner wearing,Day collar,Play collar,Locking,Leash,Training

* Cages
? Enclosures for confinement, restriction, and psychological dominance in various sizes and styles.
@ Being caged,Caging,Small,Large,Punishment,Display,Pet cage

#Pain
* Light spanking
? Gentle impact play using hands for warming up, light sensation, and playful interactions.
@ Giving,Receiving,Over clothes,Bare,Playful,Punishment,Warm-up,Cool-down

* Paddle spanking
? Using paddles for more intense impact play with different materials, textures, and techniques.
@ Giving,Receiving,Leather,Wood,Rubber,Holes,Textured,Fraternity

* Flogging
? Using floggers with multiple tails for varied sensations across different body parts and intensities.
@ Giving,Receiving,Leather,Suede,Rubber,Heavy,Light,Thuddy,Stingy

* Caning
? Using canes for precise, intense impact play that creates specific sensations and marks.
@ Giving,Receiving,Light,Heavy,Rattan,Synthetic,Stripes,Punishment

* Whipping
? Using single-tail whips for advanced impact play requiring skill and creating intense sensations.
@ Giving,Receiving,Single tail,Bull whip,Signal whip,Cracking,Marking

* Nipple clamps
? Devices that apply adjustable pressure to nipples for pain, pleasure, and extended sensation.
@ Wearing,Partner wearing,Chain,Weights,Clover,Clothespin,Magnetic,Vibrating

* Hot wax
? Dripping warm wax on the body for temperature play, sensation, and artistic purposes.
@ Giving,Receiving,Candles,Different temperatures,Massage,Removal,Colors

* Ice play
? Using cold temperatures for contrasting sensations, temperature play, and shock value.
@ Giving,Receiving,Cubes,Melting,Insertion,Nipples,Genitals,Full body

* Pinching
? Using fingers or devices to create sharp, localized sensations on various body parts.
@ Giving,Receiving,Nipples,Thighs,Arms,Clothespins,Fingers,Twisting

* Scratching
? Using nails or implements to create sensations ranging from light to intense on skin.
@ Giving,Receiving,Nails,Light,Deep,Marking,Back,Chest

#Taboo
* Age play
? Roleplay involving age differences or regression scenarios with consenting adults in various contexts.
@ Older,Younger,Caregiver,Little,Daddy,Mommy,Diaper,Pacifier

* Pet play
? Taking on animal personas with associated behaviors, care dynamics, and various animal types.
@ Pet,Owner,Puppy,Kitten,Pony,Fox,Training,Collar,Leash

* Watersports
? Activities involving urine in various contexts, scenarios, and levels of involvement.
@ Giving,Receiving,Golden shower,Marking,Drinking,Wetting,Desperation

* Scat play
? Activities involving feces in various contexts and levels of involvement.
@ Giving,Receiving,Smearing,Eating,Watching,Diaper

* Exhibitionism
? Being seen by others during intimate activities or in states of undress in various settings.
@ Being watched,Watching,Public,Semi-public,Strangers,Friends,Online,Windows

* Voyeurism
? Watching others during intimate activities with their knowledge and consent in various scenarios.
@ Watching,Being watched,Couples,Solo,Masturbation,Sex,Undressing,Sleeping

* Group activities
? Intimate activities involving more than two people in various configurations and dynamics.
@ Threesome,Foursome,Orgy,Swinging,Gang bang,Bukkake,Circle jerk,Daisy chain

* Incest roleplay
? Fantasy scenarios involving family relationships with consenting adults who are not related.
@ Parent/child,Sibling,Cousin,Step-family,Taboo talk,Forbidden

#Romantic
* Massage
? Sensual touching and body work for relaxation, arousal, and connection with various techniques.
@ Giving,Receiving,Full body,Erotic,Oil,Nuru,Tantric,Hot stone

* Kissing
? Various forms of lip and mouth contact from gentle to passionate in different contexts.
@ Light,Deep,Neck,Body,French,Butterfly,Eskimo,Forehead

* Cuddling
? Close physical contact and embracing for comfort, intimacy, and emotional connection.
@ Big spoon,Little spoon,Face to face,Naked,Clothed,After sex,Sleeping

* Sensual bathing
? Intimate washing and care activities in water settings with various elements and purposes.
@ Giving,Receiving,Together,Bubble bath,Shower,Hot tub,Washing hair,Soap play

* Romantic dinner
? Intimate dining experiences that enhance connection, anticipation, and sensual pleasure.
@ Cooking,Being cooked for,Feeding,Aphrodisiacs,Naked,Formal,Picnic

* Dancing
? Moving together to music in intimate and sensual ways for connection and arousal.
@ Leading,Following,Slow,Grinding,Lap dance,Strip tease,Pole dancing

* Love letters
? Written expressions of desire, love, and intimate thoughts for emotional and sexual connection.
@ Writing,Receiving,Erotic,Romantic,Poetry,Sexting,Email

* Gifts
? Giving and receiving presents with intimate, sexual, or romantic significance.
@ Giving,Receiving,Lingerie,Toys,Jewelry,Flowers,Surprise,Expensive

#Locations
* Bedroom
? Traditional intimate space with comfort, privacy, and various furniture and settings.
@ Own,Partner's,Hotel,Different beds,Floor,Chair,Against wall

* Shower/Bath
? Water-based intimate activities with unique sensations, cleanliness, and various water features.
@ Shower,Bath,Hot tub,Pool,Jacuzzi,Steam room,Waterfall,Beach

* Outdoors
? Nature-based intimate encounters with risk, natural settings, and various outdoor environments.
@ Forest,Beach,Garden,Balcony,Park,Mountain,Desert,Camping

* Car
? Vehicle-based intimate activities with space constraints, mobility, and various car types.
@ Backseat,Front seat,Parked,Moving,Truck,Limo,Motorcycle,RV

* Public places
? Semi-public locations with risk of discovery, excitement, and various levels of exposure.
@ Bathroom,Changing room,Office,Elevator,Library,Movie theater,Restaurant

* Kitchen
? Food-related intimate activities and domestic settings with various surfaces and food items.
@ Counter,Table,Floor,With food,Refrigerator,Against appliances,Cooking together

* Workplace
? Professional settings used for intimate activities with power dynamics and risk factors.
@ Office,Conference room,Desk,After hours,Boss's office,Supply closet,Break room

* Travel locations
? Various places encountered during travel for adventure and novelty in intimate experiences.
@ Hotel,Airplane,Train,Cruise ship,Foreign country,Vacation rental,Hostel

#Fetishes
* Feet
? Attraction to feet including various activities, worship, and different aspects of feet.
@ Worship,Massage,Kissing,Licking,Toes,Soles,Shoes,Socks

* Smoking
? Attraction to smoking or the act of smoking in intimate contexts and scenarios.
@ Watching,Doing,Cigarettes,Cigars,Pipes,Blowing smoke,Ash play

* Balloons
? Various activities involving balloons for sensual, sexual, or fetishistic purposes.
@ Inflating,Popping,Sitting,Rubbing,Latex,Different sizes,Helium

* Food play
? Using food items in intimate activities for taste, texture, and sensual experiences.
@ Eating off body,Feeding,Messy,Whipped cream,Chocolate,Fruit,Ice cream

* Medical play
? Activities involving medical equipment, procedures, and scenarios for various purposes.
@ Examination,Injection,Enema,Catheter,Speculum,Temperature,Stethoscope

* Breath play
? Activities involving controlled breathing for enhanced sensations and psychological effects.
@ Choking,Breath holding,Plastic bags,Gas masks,Underwater,Hyperventilation

* Tickling
? Using touch to create tickling sensations for playfulness, torture, or sensual purposes.
@ Giving,Receiving,Light,Intense,Feathers,Fingers,Restraint,Torture

* Transformation
? Fantasy or roleplay involving changing into different forms, genders, or beings.
@ Gender,Animal,Object,Size,Age,Species,Magical,Gradual

#Technology
* Sexting
? Sending sexually explicit messages, images, or videos through digital communication.
@ Sending,Receiving,Text,Photos,Videos,Voice messages,Apps,Anonymous

* Cam shows
? Live video performances for sexual entertainment and interaction with viewers.
@ Performing,Watching,Private,Public,Couples,Solo,Interactive,Tipping

* Virtual reality
? Using VR technology for immersive sexual experiences and fantasy scenarios.
@ Watching,Participating,POV,Interactive,Fantasy worlds,Avatars,Haptic feedback

* Sex machines
? Mechanical devices designed for sexual stimulation with various features and capabilities.
@ Using,Partner using,Fucking machine,Sybian,Remote control,Adjustable speed

* Remote control toys
? Sex toys that can be controlled remotely for long-distance play and public use.
@ Using,Partner using,Public,Long distance,App controlled,Surprise activation

* Phone sex
? Intimate conversations over the phone for sexual arousal and satisfaction.
@ Calling,Receiving,Dirty talk,Masturbation,Roleplay,Stranger,Regular partner

* Online dating
? Meeting people through digital platforms for various types of relationships and encounters.
@ Casual,Serious,Hookups,Multiple partners,Profiles,Messaging,Video calls

* Porn watching
? Viewing pornographic content alone or with others for arousal and education.
@ Solo,Together,Different genres,Amateur,Professional,Interactive,Making

#Misc
* Photography
? Taking pictures during intimate moments for memory, artistic purposes, and sharing.
@ Taking photos,Being photographed,Video,Polaroid,Professional,Amateur,Nude,Action

* Role reversal
? Switching typical roles or dynamics for variety, exploration, and power exchange.
@ Dom/sub,Top/bottom,Active/passive,Gender roles,Age roles,Power dynamics

* Sensory play
? Activities focusing on different senses beyond sight including touch, sound, taste, and smell.
@ Giving,Receiving,Feathers,Textures,Blindfolded,Music,Scents,Temperature

* Edging
? Bringing to the brink of climax repeatedly without allowing release for extended pleasure.
@ Giving,Receiving,Self,Extended,Multiple times,Ruined orgasm,Denial

* Orgasm control
? Managing and controlling climax timing, intensity, and permission for power exchange.
@ Controlling,Being controlled,Denial,Permission,Forced,Multiple,Ruined

* Aftercare
? Post-activity care and attention for emotional and physical well-being and connection.
@ Giving,Receiving,Cuddling,Talking,Cleaning,Hydration,Checking in,Debriefing

* Humiliation
? Activities involving embarrassment, degradation, or shame for psychological arousal.
@ Giving,Receiving,Verbal,Physical,Public,Private,Mild,Extreme

* Praise
? Positive reinforcement and compliments during intimate activities for encouragement and arousal.
@ Giving,Receiving,Good girl/boy,Verbal,Physical,Performance,Appearance,Effort

* Begging
? Pleading or asking for permission, pleasure, or relief in various intimate contexts.
@ Doing,Hearing,Permission,Orgasm,Touch,Stop,More,Please

* Teasing
? Playful or torturous activities that build anticipation and arousal without immediate satisfaction.
@ Giving,Receiving,Verbal,Physical,Denial,Anticipation,Slow,Extended
`
};

// Parse kink list data into structured format
function parseKinkListData(data) {
    const lines = data.trim().split('\n');
    const categories = [];
    let currentCategory = null;
    let currentItem = null;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        if (line.startsWith('#')) {
            // New category
            if (currentCategory) {
                categories.push(currentCategory);
            }
            currentCategory = {
                name: line.substring(1).trim(),
                items: []
            };
            currentItem = null;
        } else if (line.startsWith('*')) {
            // New item
            if (currentItem) {
                currentCategory.items.push(currentItem);
            }
            currentItem = {
                name: line.substring(1).trim(),
                description: '',
                subcategories: [],
                hasSubcategories: false
            };
        } else if (line.startsWith('?')) {
            // Item description
            if (currentItem) {
                currentItem.description = line.substring(1).trim();
            }
        } else if (line.startsWith('@')) {
            // Subcategories - new feature
            if (currentItem) {
                const subcategoryString = line.substring(1).trim();
                if (subcategoryString) {
                    // Parse comma-separated subcategories
                    const subcategories = subcategoryString
                        .split(',')
                        .map(sub => sub.trim())
                        .filter(sub => sub.length > 0);
                    
                    if (subcategories.length > 0) {
                        currentItem.subcategories = subcategories;
                        currentItem.hasSubcategories = true;
                    }
                }
            }
        }
    }
    
    // Add the last item and category
    if (currentItem && currentCategory) {
        currentCategory.items.push(currentItem);
    }
    if (currentCategory) {
        categories.push(currentCategory);
    }
    
    return categories;
}

// Validate subcategory string format
function validateSubcategoryString(subcategoryString) {
    if (!subcategoryString || typeof subcategoryString !== 'string') {
        return { valid: false, error: 'Subcategory string must be a non-empty string' };
    }
    
    const trimmed = subcategoryString.trim();
    if (!trimmed) {
        return { valid: false, error: 'Subcategory string cannot be empty or whitespace only' };
    }
    
    // Check for valid comma-separated format
    const subcategories = trimmed.split(',').map(sub => sub.trim()).filter(sub => sub.length > 0);
    
    if (subcategories.length === 0) {
        return { valid: false, error: 'No valid subcategories found after parsing' };
    }
    
    // Check for duplicate subcategories
    const uniqueSubcategories = [...new Set(subcategories)];
    if (uniqueSubcategories.length !== subcategories.length) {
        return { valid: false, error: 'Duplicate subcategories found' };
    }
    
    // Check for reasonable subcategory names (no special characters except spaces, hyphens, slashes)
    const invalidSubcategories = subcategories.filter(sub => 
        !/^[a-zA-Z0-9\s\-\/]+$/.test(sub) || sub.length > 50
    );
    
    if (invalidSubcategories.length > 0) {
        return { 
            valid: false, 
            error: `Invalid subcategory names: ${invalidSubcategories.join(', ')}. Only letters, numbers, spaces, hyphens, and slashes allowed. Max 50 characters each.` 
        };
    }
    
    return { valid: true, subcategories };
}

// Generate preference choices for an item
function generatePreferenceChoices(item) {
    const choices = [];
    
    if (item.hasSubcategories && item.subcategories.length > 0) {
        // Generate individual choices for each subcategory
        item.subcategories.forEach(subcategory => {
            choices.push({
                itemName: item.name,
                subcategory: subcategory,
                description: item.description,
                id: `${item.name}_${subcategory}`,
                displayName: `${item.name} (${subcategory})`
            });
        });
    } else {
        // Single choice for items without subcategories
        choices.push({
            itemName: item.name,
            subcategory: null,
            description: item.description,
            id: item.name,
            displayName: item.name
        });
    }
    
    return choices;
}

// Get all preference choices for a category
function getCategoryPreferenceChoices(category) {
    const allChoices = [];
    
    category.items.forEach(item => {
        const itemChoices = generatePreferenceChoices(item);
        allChoices.push(...itemChoices);
    });
    
    return allChoices;
}

// Get all preference choices for entire kink list
function getAllPreferenceChoices(kinkData) {
    const allChoices = [];
    
    kinkData.forEach(category => {
        const categoryChoices = getCategoryPreferenceChoices(category);
        allChoices.push(...categoryChoices);
    });
    
    return allChoices;
}

// Helper function to find a specific preference choice by ID
function findPreferenceChoiceById(kinkData, choiceId) {
    const allChoices = getAllPreferenceChoices(kinkData);
    return allChoices.find(choice => choice.id === choiceId);
}

// Helper function to get all subcategories for a specific item
function getItemSubcategories(kinkData, itemName) {
    for (const category of kinkData) {
        const item = category.items.find(item => item.name === itemName);
        if (item) {
            return item.hasSubcategories ? item.subcategories : [];
        }
    }
    return [];
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        kinklistData,
        categoryExplanations,
        parseKinkListData,
        validateSubcategoryString,
        generatePreferenceChoices,
        getCategoryPreferenceChoices,
        getAllPreferenceChoices,
        findPreferenceChoiceById,
        getItemSubcategories
    };
}
