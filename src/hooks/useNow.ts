"use client";

import { useEffect, useState } from "react";

const defaultTime = Math.floor(Date.now() / 1000);

export const useNow = () => {
  const [now, setNow] = useState(defaultTime);

  useEffect(() => {
    setTimeout(() => {
      setNow(Math.floor(Date.now() / 1000));
    });
  }, []);

  return now;
};
