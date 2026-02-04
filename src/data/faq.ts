interface FAQItem {
  id: number;
  question: string;
  answer: string | string[];
}

export const faqData: FAQItem[] = [
  {
    id: 1,
    question: "What is Society Protocol?",
    answer:
      "We are gathered because society is on the verge of a radical               transformation driven by sheer technological innovation from Nation States to Synchronized States. We believe that Sync States are the evolution to Nation States because of clearly discernible advantages and offer the promise of a better world f humanity.",
  },
  {
    id: 2,
    question: "What is the ideology?",
    answer: [
      "Fairness: Each participant in society should retain status / value equal to their contribution to society, at each point in time.",
      "Alignment: There are two inherently competing interests which must both be balanced and aligned: the individual desire and the societal interest. \n The goal of alignment is to make it such that each individual&apos;s optimal game theoretic move is the same as the optimal move for the society as a whole.",
      "Agency: We believe that agency and decentralization of control enables more potential actions for every individual, increasing human potential.",
    ],
  },
  {
    id: 3,
    question: "Who can participate?",
    answer:
      "We are gathered because society is on the verge of a radical transformation driven by sheer technological innovation from Nation States to Synchronized States. We believe that Synchronized States are the evolution to Nation States because of clearly discernible advantages and offer the promise of a better world for humanity.",
  },
];
