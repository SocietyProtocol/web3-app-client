export class ResponseError<T> extends Error {
  status: number;
  statusText: string;
  data: T;

  constructor(message: string, status: number, statusText: string, data: T) {
    super(message);
    this.name = "ResponseError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}
