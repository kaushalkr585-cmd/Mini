import m1 from "@/assets/mem-1.jpg";
import m2 from "@/assets/mem-2.jpg";
import m3 from "@/assets/mem-3.jpg";
import m4 from "@/assets/mem-4.jpg";
import m5 from "@/assets/mem-5.jpg";
import m6 from "@/assets/mem-6.jpg";

export type Memory = { id: string; title: string; sub: string; img: string; tag: string };

export const collections: { title: string; tagline: string; items: Memory[] }[] = [
  {
    title: "Trips Together",
    tagline: "The places we wandered",
    items: [
      { id: "1", title: "Paris in the Rain", sub: "May 14, 2024", img: m2, tag: "Travel" },
      { id: "2", title: "Coast Road Sunset", sub: "Aug 02, 2024", img: m3, tag: "Drive" },
      { id: "3", title: "Aurora Night", sub: "Feb 11, 2024", img: m5, tag: "Iceland" },
      { id: "4", title: "Slow Morning", sub: "Jan 06, 2025", img: m4, tag: "Café" },
      { id: "5", title: "Held Hands", sub: "Dec 31, 2024", img: m1, tag: "NYE" },
      { id: "6", title: "Letter No. 12", sub: "Mar 22, 2025", img: m6, tag: "Letter" },
    ],
  },
  {
    title: "Late Night Talks",
    tagline: "Whispers after midnight",
    items: [
      { id: "7", title: "3 AM Confessions", sub: "Apr 18, 2025", img: m1, tag: "Voice" },
      { id: "8", title: "First Snowfall", sub: "Dec 11, 2024", img: m5, tag: "Walk" },
      { id: "9", title: "Polaroid Drive", sub: "Sep 05, 2024", img: m3, tag: "Film" },
      { id: "10", title: "Two Cups", sub: "Oct 01, 2024", img: m4, tag: "Morning" },
      { id: "11", title: "City Dance", sub: "Jul 19, 2024", img: m2, tag: "Rain" },
      { id: "12", title: "Sealed With Wax", sub: "Feb 14, 2025", img: m6, tag: "V-Day" },
    ],
  },
  {
    title: "Anniversary Highlights",
    tagline: "Years in 60 seconds",
    items: [
      { id: "13", title: "One Year", sub: "Jun 06, 2023", img: m4, tag: "Y1" },
      { id: "14", title: "Two Years", sub: "Jun 06, 2024", img: m1, tag: "Y2" },
      { id: "15", title: "Paris Trip", sub: "Jun 10, 2024", img: m2, tag: "Trip" },
      { id: "16", title: "Aurora Promise", sub: "Feb 11, 2024", img: m5, tag: "Vow" },
      { id: "17", title: "Sunset Polaroid", sub: "Aug 02, 2024", img: m3, tag: "Print" },
      { id: "18", title: "Hand-Written", sub: "Jun 06, 2025", img: m6, tag: "Note" },
    ],
  },
];
