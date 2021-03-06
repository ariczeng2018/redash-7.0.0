import { filter, debounce, find } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { BigMessage } from '@/components/BigMessage';

import LoadingState from '@/components/items-list/components/LoadingState';
import { toastr } from '@/services/ng';

class SelectItemsDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    dialogTitle: PropTypes.string,
    inputPlaceholder: PropTypes.string,
    selectedItemsTitle: PropTypes.string,
    searchItems: PropTypes.func.isRequired, // (searchTerm: string): Promise<Items[]> if `searchTerm === ''` load all
    itemKey: PropTypes.func, // (item) => string|number - return key of item (by default `id`)
    // left list
    // (item, { isSelected }) => {
    //   content: node, // item contents
    //   className: string = '', // additional class for item wrapper
    //   isDisabled: bool = false, // is item clickable or disabled
    // }
    renderItem: PropTypes.func,
    // right list; args/results save as for `renderItem`. if not specified - `renderItem` will be used
    renderStagedItem: PropTypes.func,
    save: PropTypes.func, // (selectedItems[]) => Promise<any>
  };

  static defaultProps = {
    dialogTitle: 'Add Items',
    inputPlaceholder: 'Search...',
    selectedItemsTitle: 'Selected items',
    itemKey: item => item.id,
    renderItem: () => '',
    renderStagedItem: null, // use `renderItem` by default
    save: items => items,
  };

  state = {
    searchTerm: '',
    loading: false,
    items: [],
    selected: [],
    saveInProgress: false,
  };

  // eslint-disable-next-line react/sort-comp
  loadItems = (searchTerm = '') => {
    this.setState({ searchTerm, loading: true }, () => {
      this.props.searchItems(searchTerm)
        .then((items) => {
          // If another search appeared while loading data - just reject this set
          if (this.state.searchTerm === searchTerm) {
            this.setState({ items, loading: false });
          }
        })
        .catch(() => {
          if (this.state.searchTerm === searchTerm) {
            this.setState({ items: [], loading: false });
          }
        });
    });
  };

  search = debounce(this.loadItems, 200);

  componentDidMount() {
    this.loadItems();
  }

  isSelected(item) {
    const key = this.props.itemKey(item);
    return !!find(this.state.selected, i => this.props.itemKey(i) === key);
  }

  toggleItem(item) {
    if (this.isSelected(item)) {
      const key = this.props.itemKey(item);
      this.setState(({ selected }) => ({
        selected: filter(selected, i => this.props.itemKey(i) !== key),
      }));
    } else {
      this.setState(({ selected }) => ({
        selected: [...selected, item],
      }));
    }
  }

  save() {
    this.setState({ saveInProgress: true }, () => {
      const selectedItems = this.state.selected;
      Promise.resolve(this.props.save(selectedItems))
        .then(() => {
          this.props.dialog.close(selectedItems);
        })
        .catch(() => {
          this.setState({ saveInProgress: false });
          toastr.error('无法保存某些选定项。');
        });
    });
  }

  renderItem(item, isStagedList) {
    const { renderItem, renderStagedItem } = this.props;
    const isSelected = this.isSelected(item);
    const render = isStagedList ? (renderStagedItem || renderItem) : renderItem;

    const { content, className, isDisabled } = render(item, { isSelected });

    return (
      <List.Item
        className={classNames('p-l-10', 'p-r-10', { clickable: !isDisabled, disabled: isDisabled }, className)}
        onClick={isDisabled ? null : () => this.toggleItem(item)}
      >
        {content}
      </List.Item>
    );
  }

  render() {
    const { dialog, dialogTitle, inputPlaceholder, selectedItemsTitle } = this.props;
    const { loading, saveInProgress, items, selected } = this.state;
    const hasResults = items.length > 0;
    return (
      <Modal
        {...dialog.props}
        width="80%"
        title={dialogTitle}
        okText="保存"
        cancelText="取消"
        okButtonProps={{
          loading: saveInProgress,
          disabled: selected.length === 0,
        }}
        onOk={() => this.save()}
      >
        <div className="d-flex align-items-center m-b-10">
          <div className="w-50 m-r-10">
            <Input.Search
              defaultValue={this.state.searchTerm}
              onChange={event => this.search(event.target.value)}
              placeholder={inputPlaceholder}
              autoFocus
            />
          </div>
          <div className="w-50 m-l-10">
            <h5 className="m-0">{selectedItemsTitle}</h5>
          </div>
        </div>

        <div className="d-flex align-items-stretch" style={{ minHeight: '30vh', maxHeight: '50vh' }}>
          <div className="w-50 m-r-10 scrollbox">
            {loading && <LoadingState className="" />}
            {!loading && !hasResults && (
              <BigMessage icon="fa-search" message="No items match your search." className="" />
            )}
            {!loading && hasResults && (
              <List
                size="small"
                dataSource={items}
                renderItem={item => this.renderItem(item, false)}
              />
            )}
          </div>
          <div className="w-50 m-l-10 scrollbox">
            {(selected.length > 0) && (
              <List
                size="small"
                dataSource={selected}
                renderItem={item => this.renderItem(item, true)}
              />
            )}
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(SelectItemsDialog);
