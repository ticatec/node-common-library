import CommonSearchCriteria from "./CommonSearchCriteria.js";


export default abstract class SearchCriteria extends CommonSearchCriteria {

    protected constructor(criteria: any) {
        super(criteria);
    }

}