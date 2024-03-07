import type {Location} from 'history';

import type {Organization} from 'sentry/types';

import {
  isMissingInstrumentationNode,
  isParentAutogroupedNode,
  isSiblingAutogroupedNode,
  isSpanNode,
  isTraceErrorNode,
  isTransactionNode,
} from '../../guards';
import type {TraceTree, TraceTreeNode} from '../../traceTree';
import {ErrorNodeDetails} from '../details/errorNodeDetails';
import {MissingInstrumentationNodeDetails} from '../details/missingInstrumentaionNodeDetails';
import {ParentAutogroupNodeDetails} from '../details/parentAutogroupNodeDetails';
import {SiblingAutogroupNodeDetails} from '../details/siblingAutogroupNodeDetails';
import {SpanNodeDetails} from '../details/spanNodeDetails';
import {TransactionNodeDetails} from '../details/transactionNodeDetails';

export default function NodeDetail({
  node,
  organization,
  location,
}: {
  location: Location;
  node: TraceTreeNode<TraceTree.NodeValue>;
  organization: Organization;
}) {
  if (isTransactionNode(node)) {
    return (
      <TransactionNodeDetails
        node={node}
        organization={organization}
        location={location}
      />
    );
  }

  if (isSpanNode(node)) {
    return <SpanNodeDetails node={node} organization={organization} />;
  }

  if (isTraceErrorNode(node)) {
    return <ErrorNodeDetails node={node} organization={organization} />;
  }

  if (isParentAutogroupedNode(node)) {
    return <ParentAutogroupNodeDetails node={node} />;
  }

  if (isSiblingAutogroupedNode(node)) {
    return <SiblingAutogroupNodeDetails node={node} />;
  }

  if (isMissingInstrumentationNode(node)) {
    return <MissingInstrumentationNodeDetails node={node} />;
  }

  throw new Error('Unknown clicked node type');
}
