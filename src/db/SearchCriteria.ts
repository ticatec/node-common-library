import CommonSearchCriteria from "./CommonSearchCriteria";


export default abstract class SearchCriteria extends CommonSearchCriteria {

    protected constructor(criteria: any) {
        super(criteria);
    }

}