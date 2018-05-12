"use strict";

class Structure {

    constructor({wrapper = 'body', structureDataUrl = 'structure.json'} = {}) {
        this._parameters = {structureDataUrl};
        let _wrapperNode = this._wrapperNode = wrapper instanceof HTMLElement ? wrapper : document.querySelector(wrapper);
        if (!_wrapperNode) throw new Error(`Wrapper ${wrapper} not accessible`);
        return this._updateStructureData()
            .then(this._prepareWrapper.bind(this))
            .then(function () {
                window.addEventListener('resize', Structure.updateActiveItemPathes);
                return this._renderStructure(false, this._getParameter('renderRules', '_root', 'showDepth'));
            }.bind(this))
            .catch(function (error) {
                console.error(error);
                return false;
            }).result;
    }

    static closeModals() {
        document.querySelectorAll(`[data-structure-modal]`).forEach(function (modal) {
            modal.parentNode.removeChild(modal)
        });
    }

    static calculatePathPositionHandler(event) {
        let pathNode = false;
        if (this.dataset.structurePathParentItem) {
            pathNode = this
        } else {
            pathNode = document.querySelector(`[data-structure-path="${this.dataset.pathScrollEvent}"]`);
        }
        let itemId = pathNode.dataset.structurePathParentItem;
        if (!itemId) return Structure._removeActiveItemPath(itemId);
        let itemNode = document.querySelector(`[data-structure-item="${itemId}"]`);
        if (!itemNode) return Structure._removeActiveItemPath(itemId);
        let targetLevelId = parseInt(itemNode.parentNode.dataset.structureLevel) + 1;
        if (!targetLevelId || isNaN(targetLevelId)) return Structure._removeActiveItemPath(itemId);
        let targetLevelNode = document.querySelector(`[data-structure-level="${targetLevelId}"]`);
        if (!targetLevelNode) return Structure._removeActiveItemPath(itemId);
        let targetNode = targetLevelNode.querySelector('.active[data-structure-item]');
        if (!targetNode) targetNode = targetLevelNode.querySelector('[data-structure-item]');
        if (!targetNode) return Structure._removeActiveItemPath(itemId);
        if (targetNode.classList.contains('assistant')) {
            let iterateNode = targetNode;
            let parentNode = false;
            while (iterateNode = iterateNode.previousElementSibling) {
                if (!iterateNode.classList.contains('assistant')) {
                    parentNode = iterateNode;
                    break;
                }
            }
            if (!parentNode) return Structure._removeActiveItemPath(itemId);
            targetNode = parentNode;
        }
        // let levelNode = itemNode.parentNode;
        let position = {
            offsetTop: targetNode.parentNode.parentNode.offsetTop,
            offsetLeft: itemNode.offsetLeft - itemNode.parentNode.scrollLeft + 150
        };
        pathNode.style.opacity = 1;
        if (targetNode.classList.contains('partner') || targetNode.classList.contains('active')) {
            position.targetLeft = targetNode.offsetLeft - targetNode.parentNode.scrollLeft + 150;
        } else {
            let levelItems = targetLevelNode.querySelectorAll('[data-structure-item]');
            if (levelItems.length > 1) {
                let leftLevelItemOffset = levelItems[0].offsetLeft - levelItems[0].parentNode.scrollLeft + 150;
                let rightLevelItemOffset = levelItems[levelItems.length - 1].offsetLeft - levelItems[levelItems.length - 1].parentNode.scrollLeft + 150;
                if (position.offsetLeft >= leftLevelItemOffset && position.offsetLeft <= rightLevelItemOffset) {
                    pathNode.style.opacity = 0;
                } else if (position.offsetLeft < leftLevelItemOffset) {
                    position.targetLeft = leftLevelItemOffset;
                } else {
                    position.targetLeft = rightLevelItemOffset;
                }
            } else position.targetLeft = document.body.clientWidth / 2;
        }
        position.pathLeft = position.offsetLeft > position.targetLeft ? position.targetLeft : position.offsetLeft;
        position.pathWidth = (position.offsetLeft > position.targetLeft ? (position.offsetLeft - position.targetLeft) : (position.targetLeft - position.offsetLeft));
        if (position.pathWidth > 0) {
            if (position.offsetLeft > position.targetLeft) {
                position.pathLeft += 0;
                position.pathWidth += 2;
            } else {
                position.pathLeft -= 1;
                position.pathWidth += 4;
            }
        }
        pathNode.style.top = position.offsetTop + 'px';
        pathNode.style.left = position.pathLeft + 'px';
        pathNode.style.width = position.pathWidth + 'px';
    }

    static calculateSubPathPositionHandler(event) {
        let pathNode = document.querySelector(`[data-structure-sub-path="${this.dataset.subPathScrollEvent}"]`);
        let itemId = pathNode.dataset.structurePathTargetItem;
        if (!itemId) return;
        let itemNode = document.querySelector(`[data-structure-item="${itemId}"]`);
        if (!itemNode) return;
        let targetLevelId = parseInt(itemNode.parentNode.dataset.structureLevel);
        if (!targetLevelId || isNaN(targetLevelId)) return;
        let targetLevelNode = document.querySelector(`[data-structure-level="${targetLevelId}"]`);
        if (!targetLevelNode) return;
        let targetNode = targetLevelNode.querySelector('[data-structure-item]');
        if (!targetNode) return;

        let position = {
            offsetTop: targetNode.offsetTop - 72,
            offsetLeft: itemNode.offsetLeft - itemNode.parentNode.scrollLeft + 150
        };
        if (targetNode.classList.contains('partner') || targetNode.classList.contains('active')) {
            position.targetLeft = targetNode.offsetLeft - targetNode.parentNode.scrollLeft + 150;
            //else position.targetLeft = document.body.clientWidth / 2;
            position.pathLeft = position.offsetLeft > position.targetLeft ? position.targetLeft : (position.offsetLeft);
            position.pathWidth = (position.offsetLeft > position.targetLeft ? (position.offsetLeft - position.targetLeft) : (position.targetLeft - position.offsetLeft));
        }
        pathNode.style.top = position.offsetTop + 'px';
        pathNode.style.left = position.pathLeft + 'px';
        pathNode.style.width = position.pathWidth + 'px';
    }

    static calculateLevelScrollButtons() {

    }

    static updateActiveItemPathes() {
        document.querySelectorAll('[data-structure-path]').forEach(function (path) {
            Structure.calculatePathPositionHandler.call(path);
        });
        document.querySelectorAll('[data-structure-sub-path]').forEach(function (path) {
            Structure.calculateSubPathPositionHandler.call(path);
        });

        document.querySelectorAll('[data-structure-level]').forEach(function (levelNode) {
            if (levelNode.scrollWidth > document.body.clientWidth) {
                if (levelNode.scrollLeft < 100)
                    Structure._levelScrollButton(levelNode, 'left', false);
                else Structure._levelScrollButton(levelNode, 'left', true);
                if (levelNode.scrollWidth - levelNode.scrollLeft - document.body.clientWidth < 100)
                    Structure._levelScrollButton(levelNode, 'right', false);
                else Structure._levelScrollButton(levelNode, 'right', true);
            } else {
                Structure._levelScrollButton(levelNode, 'left', false);
                Structure._levelScrollButton(levelNode, 'right', false);
            }
        })
    }

    static _levelScrollButton(levelNode, side, state = true) {
        switch (side) {
            case 'left':
                levelNode.parentNode.querySelector('.structure-scroll-left').style.display = state ? 'block' : 'none';
                break;
            case 'right':
                levelNode.parentNode.querySelector('.structure-scroll-right').style.display = state ? 'block' : 'none';
                break;
        }
    }

    static _removeActiveItemPath(level) {
        Structure._pathesWrapperNode.querySelectorAll(`[data-structure-path="${level}"]`).forEach(function (pathNode) {
            pathNode.parentNode.removeChild(pathNode);
        });
    }

    _updateStructureData(url = this._parameters.structureDataUrl) {
        return fetch(url)
            .then(function (response) {
                return response.json();
            }).then(function (response) {
                if (!response || !response.structure) throw new Error(`Structure data empty`);
                if (response.parameters) Object.assign(this._parameters, response.parameters, this._parameters);
                return this._parseStructureData(response.structure);
            }.bind(this))
    }

    _parseStructureData(structure = {}) {
        this._structure = structure;
        this._structureItems = [];
        this._structureItems.push({id: 0, type: 'root', level: -1, submissive: this._structure}); // TODO: change root level to 0 (zero)
        this._parseItemData(this._structureItems[0]);
        return true;
    }

    _parseItemData(parentItem) {
        // TODO: split function and add Structure roots

        // let parentStructure = genParentStructure(parentItem.structureData);

        if (parentItem.partners) for (let i in parentItem.partners) {
            let itemData = parentItem.partners[i];
            itemData.parentItem = parentItem;
            itemData.partner = true;
            itemData.assistant = true;
            parseItem.call(this, itemData);
        }
        if (parentItem.leftPartners) for (let i in parentItem.leftPartners) {
            let itemData = parentItem.leftPartners[i];
            itemData.parentItem = parentItem;
            itemData.leftPartner = true;
            itemData.assistant = true;
            parseItem.call(this, itemData);
        }
        if (parentItem.assistants) for (let i in parentItem.assistants) {
            let itemData = parentItem.assistants[i];
            itemData.parentItem = parentItem;
            itemData.assistant = true;
            parseItem.call(this, itemData);
        }

        let childLevel = parentItem.level + 1;

        if (parentItem.submissive) for (let i in parentItem.submissive) {
            let itemData = parentItem.submissive[i];
            itemData.parentItem = parentItem;
            parseItem.call(this, itemData, childLevel);
        }

        function parseItem(itemData = {}, level = false) {
            itemData.structureData = genParentStructure(itemData);
            itemData.id = this._structureItems.length;
            itemData.level = typeof level === "number" ? level : itemData.parentItem.level;
            // itemData.level = level ? level : itemData.parentItem.level;
            this._structureItems[itemData.id] = itemData;
            this._parseItemData(itemData);
        }

        function genParentStructure(itemData = {}) {
            let structureData = {};
            if (itemData.parentItem.structureData) Object.assign(structureData, structureData, itemData.parentItem.structureData);
            if (itemData.parentItem.type === 'department') structureData.department = itemData.parentItem;
            if (itemData.parentItem.type === 'division') structureData.division = itemData.parentItem;
            return structureData;
        }
    }

    _prepareWrapper() {
        // console.log('1: _prepareWrapper');
        this._wrapperNode.classList.add('structure-wrapper');
        Structure._pathesWrapperNode = this._pathesWrapperNode = document.createElement('div');
        this._pathesWrapperNode.id = 'path-wrapper';
        this._wrapperNode.innerHTML = '';
        this._wrapperNode.appendChild(this._pathesWrapperNode);
        return true;
    }

    _renderStructure(parentId = false, depth = 0) {
        // console.log('2: _renderStructure');
        let item = this._getItemById(parentId);
        let childLevel = item.level + 1;
        // if (this._parameters && this._parameters.renderRules && this._parameters.renderRules[item.type] && this._parameters.renderRules[item.type].showDepth)
        let depthRule = this._getParameter('renderRules', item.type, 'showDepth');
        if (depthRule) depth = depthRule;
        let destroyLevelId = childLevel + depth;
        for (let i = childLevel; i <= childLevel + depth; i++) {
            destroyLevelId = i + 1;
            let level = (!this._level || !this._level[i]) ? this._renderLevel(i) : this._level[i];
            // level.node.innerHTML = '';
            this._cleanLevel(level.id);
            if (!item.submissive || item.submissive.length === 0) break;
            this._setActiveItem(item.id);
            level.items = item.submissive;
            this._renderItems(level.items, i);
            if (level.items.length === 1) {
                if (level.items[0].role === 'head') {
                    if (level.items[0].partners || level.items[0].leftPartners || level.items[0].assistants) {
                        level.node.classList.add('disable-right-space');
                    } else {
                        level.node.classList.add('center-items');
                    }
                } else {
                    if (level.items[0].partners || level.items[0].leftPartners || level.items[0].assistants) {
                        let rightSpace = level.node.appendChild(document.createElement('div'));
                        rightSpace.classList.add('right-space');
                    } else level.node.classList.add('center-items');
                    // let rightSpace = level.node.appendChild(document.createElement('div'));
                    // rightSpace.classList.add('right-space');
                }
            } else {
                let rightSpace = level.node.appendChild(document.createElement('div'));
                rightSpace.classList.add('right-space');
            }

            /*let rightSpace = level.node.appendChild(document.createElement('div'));
            rightSpace.classList.add('right-space');*/
            this._createActiveItemPath(item.id);
            if (item.type === 'department' && level.items.length > 0 && level.items[0].type === 'division') break;
            item = level.items[0];
        }
        this._destroyStructure(destroyLevelId);
    }

    _renderLevel(level = false) {
        if (!this._level) this._level = {};
        if (typeof level !== "number" || isNaN(level = parseInt(level))) throw new Error(`Level ${arguments[0]} is incorrect`);
        let targetLevel = this._level[level] = {
            id: level,
            node: document.createElement('section'),
            items: []
        };

        let levelWrapperNode = document.createElement('div');
        levelWrapperNode.classList.add('level-wrapper');

        targetLevel.node.addEventListener('scroll', Structure.updateActiveItemPathes);

        targetLevel.leftButton = document.createElement('button');
        targetLevel.leftButton.classList.add('structure-scroll-left');
        targetLevel.leftButton.addEventListener('click', function (event) {
            let scrollSection = this.parentNode.querySelector('section');
            let scroll = scrollSection.scrollLeft - 340;
            scrollSection.scroll(scroll, false);
        });
        levelWrapperNode.appendChild(targetLevel.leftButton);

        levelWrapperNode.appendChild(targetLevel.node);

        targetLevel.rightButton = document.createElement('button');
        targetLevel.rightButton.classList.add('structure-scroll-right');
        targetLevel.rightButton.addEventListener('click', function (event) {
            let scrollSection = this.parentNode.querySelector('section');
            let scroll = scrollSection.scrollLeft + 340;
            scrollSection.scroll(scroll, false);
        });
        levelWrapperNode.appendChild(targetLevel.rightButton);

        targetLevel.node.dataset.structureLevel = level;

        this._wrapperNode.appendChild(levelWrapperNode);
        return targetLevel;
    }

    _cleanLevel(level = false) {
        this._level[level].node.scrollTo(0, 0);
        this._level[level].node.querySelectorAll('.item').forEach(function (item) {
            item.parentNode.removeChild(item);
        });
        this._level[level].node.querySelectorAll('.right-space').forEach(function (item) {
            item.parentNode.removeChild(item);
        });
        this._level[level].node.className = '';
        Structure._removeActiveItemPath(level);
    }

    _getItemById(id = false) {
        if (!id) return {
            id: false,
            level: -1,
            submissive: this._structure
        }; else if (!this._structureItems || !this._structureItems[id]) throw new Error(`Item with ID: ${id} not exist`);
        else return this._structureItems[id];
    }

    _renderItems(items = [], level = false) {
        let positionsLevel = true;
        for (let i in items) {
            let item = items[i];
            if (!level) level = item.level;
            if (!item.role || item.role !== 'position') positionsLevel = false;
            let itemNode = this._renderItem(item, level);
            if (item.partners && item.partners.length > 0)
                for (let j in item.partners) {
                    let partner = item.partners[j];
                    partner.order = j;
                    this._renderItem(partner, level);
                }
            if (item.leftPartners && item.leftPartners.length > 0)
                for (let j in item.leftPartners) {
                    let partner = item.leftPartners[j];
                    partner.left = true;
                    // partner.order = j;
                    if (item.role === 'head') partner.headMargin = true;
                    this._renderItem(partner, level);
                }
            if (item.assistants && item.assistants.length > 0) {
                this._level[level].node.classList.add('extended-level');
                for (let j in item.assistants) {
                    let assistant = item.assistants[j];
                    assistant.subLevel = true;
                    assistant.order = j;
                    this._renderItem(assistant, level);
                }
            }
            if (this._level[level].node.classList.contains('extended-level') && !itemNode.classList.contains('sub-level')) {
                let styleElem = itemNode.appendChild(document.createElement("style"));
                let itemPathWidth = 0;
                let prevItem = itemNode;
                while (prevItem = prevItem.previousSibling) {
                    itemPathWidth = itemNode.offsetLeft - prevItem.offsetLeft;
                }
                if (itemPathWidth <= 0) itemPathWidth = 1;
                styleElem.innerHTML = `.structure-wrapper section.extended-level > .item[data-structure-item="${item.id}"]:not(.active-child):not(.active):before {width: ${itemPathWidth}px;left: calc(-${itemPathWidth}px + 50%);`;
            }
        }
        if (positionsLevel) this._level[level].node.classList.add('active-positions');
    }

    _renderItem(item = {}, level = false) {
        if (level === false) level = item.level;
        if (!this._level[level]) throw new Error(`Level ${level} is not available`);
        let itemNode = document.createElement('div');
        itemNode.dataset.structureItem = item.id;
        itemNode.classList.add('item');
        if (item.type) itemNode.classList.add(item.type);
        if (item.role) itemNode.classList.add(item.role);
        if ((item.partners && item.partners.length > 0) || (item.assistants && item.assistants.length > 0)) itemNode.classList.add('partner');
        if (item.subLevel) itemNode.classList.add('sub-level');

        if (parseInt(item.order) === 0) itemNode.classList.add('first-after-head');
        if (item.left) itemNode.classList.add('left');

        if (item.headMargin) itemNode.classList.add('head-margin');
        // if (item.title) itemNode.innerHTML += `<div class="title">${item.title}</div>`;
        // if (item.description) itemNode.innerHTML += `<div class="description">${item.description}</div>`;
        if (item.roleTitle) itemNode.innerHTML += `<div class="title">${item.roleTitle}</div><div class="description">${item.name}</div>`;
        else itemNode.innerHTML += `<div class="title">${item.name}</div>`;
        let self = this;
        if (item.submissive && item.submissive.length > 0) {
            itemNode.style.cursor = 'pointer';
            itemNode.innerHTML += `<div class="state-button"></div>`;

            itemNode.addEventListener('click', function (event) {
                if (!this.dataset.structureItem) return false;
                let id = this.dataset.structureItem;
                if (this.classList.contains('active')) {
                    let level = parseInt(this.parentNode.dataset.structureLevel);
                    self._unsetActiveItems(level);
                    Structure._removeActiveItemPath(level);
                    self._destroyStructure(level + 1);
                } else {
                    self._setActiveItem(id);
                    self._renderStructure(id);
                    self._createActiveItemPath(id);
                }
                Structure.updateActiveItemPathes();
            });
        }
        let itemModal = document.createElement('div');
        itemModal.classList.add('modal-link');
        itemModal.addEventListener('click', function (event) {
            event.stopPropagation();
            if (!this.parentNode.dataset.structureItem) return false;
            let id = this.parentNode.dataset.structureItem;
            self._showItemModal(id);

        });
        itemNode.appendChild(itemModal);
        if (item.left) {
            let parentItemNode = document.querySelector(`[data-structure-item="${item.parentItem.id}"]`);
            parentItemNode.parentNode.insertBefore(itemNode, parentItemNode);
        } else this._level[level].node.appendChild(itemNode);
        return itemNode;
    }

    _setActiveItem(id = false) {
        let item = this._getItemById(id);
        this._unsetActiveItems(item.level);
        let itemNode = document.querySelector(`[data-structure-item="${id}"]`);
        if (!itemNode) return;
        itemNode.classList.add('active');
        if (itemNode.classList.contains('assistant')) {
            let iterateNode = itemNode;
            let parentNode = false;
            while (iterateNode = iterateNode.previousElementSibling) {
                if (!iterateNode.classList.contains('assistant')) {
                    parentNode = iterateNode;
                    break;
                }
            }
            if (parentNode) parentNode.classList.add('active-child');
        }
    }

    _unsetActiveItems(level) {
        let levelNode = document.querySelector(`[data-structure-level="${level}"]`);
        if (!levelNode) return;
        levelNode.querySelectorAll(`[data-structure-item]`).forEach(this._unsetActiveItem);
    }

    _unsetActiveItem(element) {
        element.classList.remove('active');
        element.classList.remove('active-child');
    }

    _destroyStructure(level = 0) {
        let maxLevel = Object.values(this._level).length - 1;
        for (let i = maxLevel; i >= level; i--) {
            Structure._removeActiveItemPath(i);
            if (!this._level[i]) continue;
            let levelData = this._level[i];
            let levelWrapper = levelData.node.parentNode;
            levelWrapper.parentNode.removeChild(levelWrapper);
            delete this._level[i];
        }
    }

    _createActiveItemPath(id) {
        let item = this._getItemById(id);
        let itemNode = document.querySelector(`[data-structure-item="${id}"]`);
        if (!itemNode) return;
        let pathId = item.level;
        Structure._removeActiveItemPath(pathId);
        let path = document.createElement('div');
        path.classList.add('active-path');
        path.dataset.structurePath = pathId;
        path.dataset.structurePathParentItem = item.id;
        let levelNode = document.querySelector(`[data-structure-level="${pathId}"]`);
        let parentLevelNode = document.querySelector(`[data-structure-level="${pathId - 1}"]`);
        if (levelNode) {
            levelNode.dataset.pathScrollEvent = pathId;
            //levelNode.addEventListener('scroll', Structure.updateActiveItemPathes);
        }
        if (parentLevelNode) {
            parentLevelNode.dataset.pathScrollEvent = pathId;
            //parentLevelNode.addEventListener('scroll', Structure.updateActiveItemPathes);
        }
        this._pathesWrapperNode.appendChild(path);
        // Structure.calculatePathPositionHandler.call(path);
        Structure.updateActiveItemPathes();//.call(path);
    }

    _createActiveSubItemPath(id) {
        let item = this._getItemById(id);
        let itemNode = document.querySelector(`[data-structure-item="${id}"]`);
        if (!itemNode) return;
        let pathId = item.level;
        this._removeActiveSubItemPath(pathId);
        let path = document.createElement('div');
        path.classList.add('active-path');
        path.dataset.structureSubPath = pathId;
        path.dataset.structureSubPathTargetItem = item.id;
        let levelNode = document.querySelector(`[data-structure-level="${pathId}"]`);
        // let parentLevelNode = document.querySelector(`[data-structure-level="${pathId - 1}"]`);
        if (levelNode) {
            levelNode.dataset.subPathScrollEvent = pathId;
            levelNode.addEventListener('scroll', Structure.updateActiveItemPathes);
        }
        this._pathesWrapperNode.appendChild(path);
        // Structure.calculatePathPositionHandler.call(path);
        Structure.updateActiveItemPathes();//.call(path);
    }

    _removeActiveSubItemPath(level) {
        this._pathesWrapperNode.querySelectorAll(`[data-structure-sub-path="${level}"]`).forEach(function (pathNode) {
            pathNode.parentNode.removeChild(pathNode);
        });
    }

    _getParameter(...path) {
        let parentParameter = this._parameters;
        while (parentParameter[path[0]]) {
            if (path.length === 1) return parentParameter[path[0]];
            parentParameter = parentParameter[path[0]];
            path.shift();
        }
        return false;
    }

    _showItemModal(id = false) {
        document.querySelectorAll(`[data-structure-modal]`).forEach(function (modal) {
            modal.parentNode.removeChild(modal)
        });
        if (!id) throw new Error('Empty item ID');
        let item = this._getItemById(id);
        let modal = document.createElement('modal');
        modal.addEventListener('click', Structure.closeModals);
        modal.classList.add('structure-modal-wrapper');
        modal.dataset.structureModal = id;
        modal.innerHTML = this._genModalContent(item);
        modal.querySelector('.structure-modal-content').addEventListener('click', e => e.stopPropagation());
        modal.querySelectorAll(`[data-structure-modal-link]`).forEach(this._prepareItemModalLink, this);
        document.body.appendChild(modal);
        // return this._loadModalData(id);
    }

    _prepareItemModalLink(link) {
        let self = this;
        link.addEventListener('click', function (event) {
            self._showItemModal(this.dataset.structureModalLink);
        });
    }

    _loadModalData(id = false) {
        let item = this._getItemById(id);
        let data = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: item.type,
                id: item.id,
            })
        };
        return fetch(this._parameters.modalDataUrl, data)
            .then(function (response) {
                return response.json();
            }).then(function (response) {
                if (!response || !response.data) throw new Error(`Modal data empty`);
                let modal = document.querySelector(`[data-structure-modal="${item.id}"]`);
                if (!modal) return;
                Object.assign(response.data, item, response.data);
                modal.innerHTML = this._genModalContent(response.data);
            }.bind(this));
    }

    _genModalContent(item) {
        if (!item.type) throw new Error('Incorrect item type');

        let source = `<div class="structure-modal-content">${genHeader(item)}<div class="modal-body">`;

        switch (item.type) {
            case 'profile':
                if (item.roleTitle) source += `<h2 class="title">${item.roleTitle}</h2>`;
                if (item.structureData.division) source += `<a class="structure-link" data-structure-modal-link="${item.structureData.division.id}">${item.structureData.division.name}</a><br><br>`;
                if (item.structureData.department) source += `<a class="structure-link" data-structure-modal-link="${item.structureData.department.id}">${item.structureData.department.name}</a>`;
                /*if (item.role === 'headOfDepartment' || item.role === 'headOfDivision') {
                    let structure = item.parentItem;
                    source += `<a class="structure-link" data-structure-modal-link="${structure.id}">${structure.name}</a>`;
                }*/
                source += `<hr><div class="sub-title">Основная информация</div>`;
                if (item.partners && item.partners.length > 0) {
                    source += `<div class="info-line"><strong>Асистент: </strong>${item.partners[0].name}</div>`;
                }
                source += genProfileContacts.call(this, item);
                break;
            case 'department':
                source += genStructureManagement.call(this, item, 'headOfDepartment');
                if (item.submissive && item.submissive[0]) {
                    let structure = item.submissive[0].role === 'headOfDepartment' ? item.submissive[0] : item;
                    source += `<hr><div class="sub-title">Подразделения</div><div class="department-structure">${genDepartmentStructure(structure, 'division')}</div>`;
                }
                break;
            case 'division':
                source += genStructureManagement.call(this, item, 'headOfDivision');
                if (item.submissive && item.submissive[0]) {
                    let structure = item.submissive[0].role === 'headOfDivision' ? item.submissive[0] : item;
                    source += `<hr><div class="sub-title">Сотрудники отдела</div><div class="division-structure">${genDivisionStructure(structure, 'profile')}</div>`;
                }
                break;
            default:
                source += `Unsupported type`;
                break;
        }

        source += `</div><button class="structure-modal-close" onclick="Structure.closeModals();">×</button></div>`;

        function genHeader(item = {}) {
            let source = '';
            if (!item) return source;
            source += `<div class="modal-header" ${item.cover ? `style="background-image: url('${item.cover}');"` : ``}>`;
            if (item.image) source += `<div class="image"><img src="${item.image}"></div>`;
            else source += `<div class="image"><img src="assets/logo.svg"></div>`;
            source += `<div class="right-section">`;
            if (item.name) source += `<h2 class="title">${item.name}</h2>`;
            if (item.birthday) {
                let dateComponents = item.birthday.split('-').reverse();
                let bithDate = new Date(dateComponents[0], dateComponents[1], dateComponents[2]).toLocaleString('ru', {
                    month: 'long',
                    day: 'numeric'
                });
                source += `<div class="birthday">Дата рождения: ${bithDate}</div>`;
            }
            source += `</div></div>`;
            return source;
        }

        function genStructureManagement(item = {}, role = false) {
            let source = '';
            let parentRole = true;
            if (item.submissive || item.submissive.length > 0) {
                if (role) {
                    for (let i in item.submissive) if (item.submissive[i].role === role) parentRole = false;
                } else parentRole = false;
                if (parentRole) {
                    source += genManager.call(this, item.parentItem);
                } else for (let i in item.submissive) source += genManager.call(this, item.submissive[i]);
            }
            return source;
        }

        function genManager(manager = {}) {
            source = '';
            source += `<div class="manager-item">`;
            if (manager.image) source += `<div class="image"><img src="${manager.image}"></div>`;
            else source += `<div class="image"><img src="assets/logo.svg"></div>`;
            source += `<div class="info-section">`;
            if (manager.roleTitle) source += `<div class="title">${manager.roleTitle}</div>`;
            if (manager.name) source += `<div class="sub-title">${manager.name}</div>`;
            source += genProfileContacts.call(this, manager) + `</div></div>`;
            if (manager.partners && manager.partners.length > 0) {
                for (let i in manager.partners) source += genManager.call(this, manager.partners[i]);
            }
            return source;
        }

        function genProfileContacts(item = {}) {
            let source = '';
            let fieldParameters = this._getParameter('parseRules', item.type);
            if (fieldParameters) {
                let fieldIds = Object.keys(fieldParameters);
                for (let i in fieldIds) {
                    let fieldId = fieldIds[i];
                    if (!item[fieldId]) continue;
                    source += `<div class="info-line"><strong>${fieldParameters[fieldId].title}:</strong>${item[fieldId]}</div>`;
                }
            } else {
                if (item.phoneWork) source += `<div class="info-line"><strong>Рабочий телефон:</strong>${item.phoneWork}</div>`;
                if (item.phone) source += `<div class="info-line"><strong>Телефон:</strong>${item.phone}</div>`;
                if (item.email) source += `<div class="info-line"><strong>Email:</strong>${item.email}</div>`;
            }
            return source;
        }

        function genDepartmentStructure(item = {}, childType = false) {
            let source = '';
            for (let i in item.submissive) {
                let structureItem = item.submissive[i];
                if (!structureItem) continue;
                if (childType) if (structureItem.type !== childType) continue;
                source += `<div class="structure-item"><h3>${structureItem.name}</h3>`;
                if (structureItem.submissive && structureItem.submissive[0]) {
                    let structureManager = structureItem.submissive[0];
                    source += `<div class="info"><hr><div class="role">${structureManager.roleTitle}</div>
                    <div class="name">${structureManager.name}</div></div>`;
                }
                source += `</div>`;
            }
            return source;
        }

        function genDivisionStructure(item = {}, childType = false) {
            let source = '';
            if (item.submissive && item.submissive.length > 0) {
                source += '<div class="structure-header"><div>ФИО</div><div>Рабочий телефон</div><div>Телефон</div><div>Email</div></div>';
                for (let i in item.submissive) {
                    let positionItem = item.submissive[i];
                    if (!positionItem) continue;
                    if (childType) if (positionItem.type !== childType) continue;
                    source += `<div class="division-position">`;
                    source += `<div>${positionItem.name ? positionItem.name : ''}<br><span>${positionItem.roleTitle}</span></div>`;
                    source += `<div>${positionItem.phoneWork ? positionItem.phoneWork : ''}</div>`;
                    source += `<div>${positionItem.phone ? positionItem.phone : ''}</div>`;
                    source += `<div>${positionItem.email ? positionItem.email : ''}</div>`;
                    source += `</div>`;
                }
            }
            return source;
        }

        return source;
    }
}
