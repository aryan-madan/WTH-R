import { Msg } from './types';

export const msg = (code: number, day: number, temp: number): Msg => {
  
  // scorching (>35)
  if (temp >= 35) {
    const list = [
        { head: "I fear I'm melting.", sub: "The sun is literally gaslighting me right now." },
        { head: "My makeup.", sub: "It's dripping. Do not perceive me." },
        { head: "AC is my soulmate.", sub: "If you touch the thermostat, we fight." },
        { head: "Sensory Overload.", sub: "Everything is sticky and I am upset." },
        { head: "Cooked.", sub: "I stepped outside and instantly regretted it." },
        { head: "Dying.", sub: "Send an iced coffee or I will perish." },
        { head: "Aura: -5000.", sub: "Sweating this much is actually embarrassing." }
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  // hot (30-34)
  if (temp >= 30) {
    const list = [
        { head: "Ew, humidity.", sub: "My hair has its own zip code now." },
        { head: "Hydrate.", sub: "Drink water. You look dehydrated. Yikes." },
        { head: "Rotting inside.", sub: "Too hot to exist. Wake me up at sunset." },
        { head: "Glistening.", sub: "I'm telling myself it's a glow. It's sweat." },
        { head: "Spicy air.", sub: "Why is the wind hot? Who allowed this?" },
        { head: "Deodorant check.", sub: "Reapply. For the sake of humanity." },
        { head: "Mood: Aggressive.", sub: "Do not ask me to go for a walk." }
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  // warm / nice (20-29)
  if (temp >= 20) {
    const list = [
        { head: "Slay.", sub: "Mother Nature finally took her meds." },
        { head: "Fit Check.", sub: "The outfit is hitting. Take a picture of me." },
        { head: "Main Character.", sub: "Play your playlist. We are romanticizing this." },
        { head: "We outside.", sub: "Touch grass. It's actually legal today." },
        { head: "Golden Hour.", sub: "The lighting is elite. Don't block my sun." },
        { head: "Certified Fresh.", sub: "Zero complaints. Which is rare for me." },
        { head: "Vibes: Immaculate.", sub: "Let's go spend money on overpriced drinks." }
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  // mild / cool (10-19)
  if (temp >= 10) {
    const list = [
        { head: "Hoodie Szn.", sub: "Steal his hoodie and never give it back." },
        { head: "It's giving... nothing.", sub: "The weather has zero personality today." },
        { head: "Mid.", sub: "Not hot, not cold. Just annoying." },
        { head: "Toxic Trait.", sub: "Thinking I don't need a jacket. I was wrong." },
        { head: "Cozy era.", sub: "Soft blankets and cancelling plans. Love that." },
        { head: "Grey.", sub: "It's a gloomcore kind of day. Embrace the rot." },
        { head: "Loading...", sub: "Waiting for the sun to text back." }
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  // cold (0-9)
  if (temp >= 0) {
    const list = [
        { head: "Brick.", sub: "It's actually disrespectful outside." },
        { head: "Dry skin era.", sub: "My skincare routine is fighting for its life." },
        { head: "Layers.", sub: "I look like a marshmallow. A cute marshmallow." },
        { head: "Shrinkage.", sub: "It's cold. Mind your business." },
        { head: "Blue.", sub: "Turning into a Smurf. Not the aesthetic I wanted." },
        { head: "L.", sub: "Shivering is not a vibe. Make it stop." },
        { head: "Winter Arc.", sub: "I am going into hibernation. Do not disturb." }
    ];
    return list[Math.floor(Math.random() * list.length)];
  }

  // freezing (<0)
  if (temp < 0) {
     const list = [
        { head: "I am simply passing away.", sub: "The air hurts my face. Rude." },
        { head: "Frozen.", sub: "My soul has left the chat. Goodbye." },
        { head: "Numb.", sub: "I can't feel my toes. Is this the end?" },
        { head: "Frostbite.", sub: "If my nose falls off, I'm suing everyone." },
        { head: "Canon event.", sub: "Going outside today is a tragedy waiting to happen." },
        { head: "Icy.", sub: "My heart is warmer than this. And that's saying something." },
        { head: "GGs.", sub: "We lost. Nature won. Stay inside." }
     ];
     return list[Math.floor(Math.random() * list.length)];
  }

  return { head: "You broke it.", sub: "This is why we can't have nice things." };
};