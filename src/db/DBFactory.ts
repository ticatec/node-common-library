import DBConnection from "./DBConnection";

export default interface DBFactory {
    createDBConnection():Promise<DBConnection>;
}