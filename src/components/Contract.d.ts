declare namespace Contract {
  interface Item {
    id?: number;
    name?: string;
    address: string;
    createdTime?: number;
    abi?: object | [];
    network?: string;
    category?: string;
    order?: number;
  }
}
