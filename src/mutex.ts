import { Semaphore } from "async-mutex";

export const createMutex = (value: number) => {
  const semaphore = new Semaphore(value);
	const runExclusive = <T>(callback: () => Promise<T>): Promise<T> => {
		return semaphore.runExclusive(callback);
	};
  return { runExclusive };
};
