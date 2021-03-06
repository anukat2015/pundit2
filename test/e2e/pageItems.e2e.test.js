describe("Page Items interaction", function() {
    var p = browser;

    beforeEach(function(){
        p.get('/app/examples/pageItemsContainer.html');
    });

    it("should correctly load", function(){
        // check if exist search input
        element.all(by.css('.pnd-panel-tab-content-header input')).then(function(input) {
            expect(input.length).toBe(1);
        });
        // check if exist tabs header
        element.all(by.css('.pnd-panel-tab-content-content .pnd-tab-header')).then(function(th) {
            expect(th.length).toBe(1);
        });
        // check if exist tabs content
        element.all(by.css('.pnd-panel-tab-content-content .pnd-tab-content')).then(function(tc) {
            expect(tc.length).toBe(1);
        });
        // check if exist action button
        element.all(by.css('.pnd-panel-tab-content-footer button')).then(function(btn) {
            expect(btn.length).toBe(3);
        });
        // check if exist items
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(2);
        });
    });

    it("should correctly filter by type when change active tab", function(){
        // check initial items number (all items tab)
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(2);
        });

        // got to text items tab
        element(by.css('.pnd-tab-header > li > a[data-index="1"]')).click();
        // check new items number (text items tab)
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(1);
            // check item uri
            expect(items[0].getAttribute('uri')).toEqual('textFragmentUri');
        });

        // got to image items tab
        element(by.css('.pnd-tab-header > li > a[data-index="2"]')).click();
        // check new items number (image items tab)
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(1);
            // check item uri
            expect(items[0].getAttribute('uri')).toEqual('imageFragmentUri');
        });

        // got to entities items tab
        element(by.css('.pnd-tab-header > li > a[data-index="3"]')).click();
        // check new items number (image items tab)
        element.all(by.css('.pnd-tab-content item')).then(function(items) {
            expect(items.length).toBe(0);
        });
    });

    it("should correctly filter by label when input text", function(){
        // check initial items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(2);
        });
        // search text
        element(by.css('.pnd-panel-tab-content-header input')).sendKeys('text');
        // check new items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(1);
        });
    });

    it("should correctly clear filter when click input x icon", function(){
        // check initial items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(2);
        });
        // search text
        element(by.css('.pnd-panel-tab-content-header input')).sendKeys('text');
        // check new items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(1);
        });
        // click clear icon
        element(by.css('.pnd-panel-tab-content-header span')).click();
        // check new items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(2);
        });
    });

    it("should correctly show no found messagge", function(){
        // check initial items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(2);
        });
        // search text
        element(by.css('.pnd-panel-tab-content-header input')).sendKeys('testo impossibile da trovare');
        // check new items number
        element.all(by.css('.pnd-tab-content .active item')).then(function(items) {
            expect(items.length).toBe(0);
        });
        // check if is shown no found messagge
        element(by.css('.pnd-tab-content .pnd-dashboard-welcome')).then(function(msg) {
            msg.getText().then(function(str){
                expect(str.indexOf('testo impossibile da trovare')).toBeGreaterThan(-1);
            });
        });
    });

    // it("should correctly open order dropdown", function(){
    //     // open dropdown menu
    //     element(by.css('.pnd-panel-tab-content-footer button')).click();
    //     // chek if dropdown exist
    //     element.all(by.css('.pnd-panel-tab-content-footer .dropdown-menu')).then(function(d) {
    //         expect(d.length).toBe(1);
    //     });
    // });

});